import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { blockPointId } from "../../src/modules/campaigns/server/planner-source";
import {
  hashPin,
  privateKey,
  newSessionToken,
  tokenHash,
  SESSION_SECONDS,
} from "../../src/modules/campaigns/server/auth/crypto";
import {
  seedPlannerFixture,
  fixtureCampaign,
  fixtureRegistration,
} from "../campaign-planner/fixture";
export { fixtureCampaign, fixtureRegistration };
export const fixtureSecret = "Local-Phase7-Secret-Only-0123456789";
export const fixturePin = "638251";
let pin: Promise<string> | undefined;
/** Synthetic operational fixture. Explicitly refuses production credentials/hosts. */
export async function seedProgramFixture() {
  assert.equal(process.env.FIREBASE_ADMIN_PROJECT_ID, "demo-campaign-auth");
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost):/,
  );
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost):/,
  );
  process.env.CAMPAIGNS_AUTH_SECRET = fixtureSecret;
  const response = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-campaign-auth/databases/(default)/documents`,
    { method: "DELETE" },
  );
  assert.equal(response.status, 200);
  const credentials = await seedPlannerFixture();
  const db = campaignsAdminDb(),
    batch = db.batch(),
    now = Timestamp.now();
  batch.update(db.collection("campaignDays").doc("day-2"), { active: true });
  for (let p = 0; p < 8; p++)
    batch.update(db.collection("points").doc(`point-${p}`), {
      sortOrder: p,
      locationText: `Ubicación ficticia ${p + 1}`,
      description: "Referencia peatonal ficticia",
    });
  for (const b of [3, 4, 6])
    for (let p = 0; p < 8; p++)
      batch.set(
        db
          .collection("blockPoints")
          .doc(blockPointId(`block-${b}`, `point-${p}`)),
        {
          campaignId: fixtureCampaign,
          timeBlockId: `block-${b}`,
          pointId: `point-${p}`,
          active: true,
        },
      );
  // Accepted unit, ordinary complete point, incomplete point, and two genuine
  // planner-compatible exception flags. One previous turn needs no new flag.
  for (const [
    id,
    index,
    b,
    p,
    slot,
    availabilityOverride,
    maxTurnsOverride,
  ] of [
    ["accepted-a", 0, 0, 0, 1, false, false],
    ["accepted-b", 1, 0, 0, 2, false, false],
    ["ordinary-a", 3, 0, 1, 1, false, false],
    ["ordinary-b", 4, 0, 1, 2, false, false],
    ["incomplete", 5, 0, 2, 1, false, false],
    ["limit-first", 6, 0, 2, 2, false, false],
    ["limit-extra", 6, 1, 1, 1, false, true],
    ["availability", 70, 2, 7, 1, true, false],
  ] as const) {
    batch.set(db.collection("campaignAssignments").doc(id), {
      campaignId: fixtureCampaign,
      timeBlockId: `block-${b}`,
      pointId: `point-${p}`,
      registrationId: fixtureRegistration(index),
      slotNumber: slot,
      status: "draft",
      createdBy: "dashboard-organizer",
      createdAt: now,
      updatedAt: now,
      version: 1,
      availabilityOverride,
      maxTurnsOverride,
    });
  }
  batch.set(db.collection("campaignAssignments").doc("cancelled-history"), {
    campaignId: fixtureCampaign,
    timeBlockId: "block-0",
    pointId: "point-0",
    registrationId: fixtureRegistration(10),
    slotNumber: 1,
    status: "cancelled",
    createdBy: "dashboard-organizer",
    createdAt: now,
    updatedAt: now,
    version: 3,
    availabilityOverride: false,
    maxTurnsOverride: false,
  });
  const cookies: Record<number, string> = {};
  const pinHash = await (pin ??= hashPin(fixtureSecret, fixturePin));
  for (const index of [0, 1, 7]) {
    const phone = `+569${40000000 + index}`,
      id = `person-${index}`,
      token = newSessionToken();
    cookies[index] = token;
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
  await batch.commit();
  return { ...credentials, cookies };
}
