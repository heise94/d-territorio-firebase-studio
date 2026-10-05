import { Timestamp } from "firebase-admin/firestore";
import {
  seedProgramFixture,
  fixtureCampaign,
  fixtureSecret,
} from "../campaign-program/fixture";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import {
  privateKey,
  newSessionToken,
  tokenHash,
  SESSION_SECONDS,
} from "../../src/modules/campaigns/server/auth/crypto";
import {
  getProgram,
  publishProgram,
} from "../../src/modules/campaigns/server/program-service";
export { fixtureCampaign };
/** Inherits explicit localhost/demo-project refusal checks. Never calls public bulk registration. */
export async function seedChangesFixture(
  configure?: (db: ReturnType<typeof campaignsAdminDb>) => Promise<void>,
) {
  const credentials = await seedProgramFixture();
  const db = campaignsAdminDb(),
    now = Timestamp.now(),
    batch = db.batch();
  const pinHash = (
    await db.collection("participants").doc("person-0").get()
  ).data()!.pinHash;
  for (const index of [3, 4, 5, 6, 8, 9, 10]) {
    const id = `person-${index}`,
      phone = `+569${40000000 + index}`,
      token = newSessionToken();
    credentials.cookies[index] = token;
    batch.update(db.collection("participants").doc(id), {
      id,
      pinHash,
      sessionVersion: 0,
    });
    batch.set(
      db
        .collection("campaignParticipantPhones")
        .doc(privateKey(fixtureSecret, "phone", phone)),
      { participantId: id },
    );
    batch.set(db.collection("deviceSessions").doc(tokenHash(token)), {
      id: tokenHash(token),
      participantId: id,
      sessionVersion: 0,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + SESSION_SECONDS * 1000),
    });
  }
  batch.update(db.collection("participants").doc("person-3"), {
    fullName: "Juan ficticio",
  });
  batch.update(db.collection("participants").doc("person-7"), {
    fullName: "Ana ficticia",
  });
  await batch.commit();
  if (configure) await configure(db);
  const view = await getProgram(credentials.token, fixtureCampaign);
  await publishProgram(credentials.token, fixtureCampaign, {
    expectedPlannerRevision: view.plannerRevision,
    confirmWarnings: true,
  });
  return credentials;
}
