import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { blockPointId } from "../../src/modules/campaigns/server/planner-source";
import {
  seedDashboardFixture,
  fixtureCampaign,
  fixtureEmail,
  fixturePassword,
  fixtureToken,
  fixtureRegistration,
} from "../campaign-admin-dashboard/fixture";
export {
  fixtureCampaign,
  fixtureEmail,
  fixturePassword,
  fixtureRegistration,
  fixtureToken,
};
/** Synthetic local-only operational fixture; never bypasses production registration limits. */
export async function seedPlannerFixture() {
  const credentials = await seedDashboardFixture(),
    db = campaignsAdminDb(),
    now = Timestamp.now();
  await db.collection("pairRequests").doc("corrupt").delete();
  const auth = getAuth(campaignsAdminApp());
  try {
    await auth.getUser("planner-organizer-2");
  } catch {
    await auth.createUser({
      uid: "planner-organizer-2",
      email: "organizer-planner-2@example.test",
      password: fixturePassword,
    });
  }
  await auth.updateUser("planner-organizer-2", { disabled: false });
  await auth.setCustomUserClaims("planner-organizer-2", {
    campaign_admin: true,
  });
  for (const collection of [
    "campaignAssignments",
    "blockPoints",
    "campaignPlannerLocks",
  ]) {
    const entries = await db.collection(collection).get();
    const removal = db.batch();
    entries.docs.forEach((entry) => removal.delete(entry.ref));
    await removal.commit();
  }
  const batch = db.batch();
  batch.update(db.collection("campaigns").doc(fixtureCampaign), {
    status: "planning",
    maxPointsDefault: 8,
  });
  for (let p = 0; p < 8; p++)
    batch.set(db.collection("points").doc(`point-${p}`), {
      campaignId: fixtureCampaign,
      name: `Punto ficticio ${p + 1}`,
      active: true,
    });
  for (let b = 0; b < 3; b++)
    for (let p = 0; p < [3, 5, 8][b]; p++)
      batch.set(
        db
          .collection("blockPoints")
          .doc(blockPointId(`block-${b}`, `point-${p}`)),
        {
          campaignId: fixtureCampaign,
          timeBlockId: `block-${b}`,
          pointId: `point-${p}`,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      );
  for (let index = 3; index < 70; index++)
    if (index !== 20)
      for (let b = 0; b < 3; b++)
        batch.set(
          db.collection("availabilities").doc(`availability-${index}-${b}`),
          {
            campaignId: fixtureCampaign,
            registrationId: fixtureRegistration(index),
            timeBlockId: `block-${b}`,
            available: true,
            createdAt: now,
            updatedAt: now,
          },
        );
  batch.update(
    db.collection("campaignRegistrations").doc(fixtureRegistration(6)),
    { maxTurns: 1 },
  );
  batch.set(db.collection("points").doc("foreign-point"), {
    campaignId: "empty-draft",
    name: "Otro ámbito",
    active: true,
  });
  await batch.commit();
  return {
    ...credentials,
    secondToken: await fixtureToken("organizer-planner-2@example.test"),
  };
}
