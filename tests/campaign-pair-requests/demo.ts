/** Fictitious fixtures for the seven browser flows. Never connects to production. */
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import { CampaignRegistrationService } from "../../src/modules/campaigns/server/registration-service";

async function seed() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8088");
  const app = initializeApp(
    { projectId: "demo-campaign-auth" },
    "pair-browser-demo",
  );
  const db = getFirestore(app);
  try {
    const auth = new ParticipantAuthService(
      db,
      "integration-test-only-secret-not-production",
    );
    const registrations = new CampaignRegistrationService(db, auth);
    await db
      .collection("congregations")
      .doc("pair-demo-cong")
      .set({ name: "Congregación ficticia", active: true });
    const identities = [];
    for (const [fullName, phone] of [
      ["Alicia Demo", "913111131"],
      ["José Demo", "913111132"],
    ])
      identities.push(
        await auth.register({
          fullName,
          phone,
          pin: "1234",
          confirmPin: "1234",
          congregationId: "pair-demo-cong",
        }),
      );
    for (const [campaignId, name] of [
      ["pair-demo", "Campaña de prueba vínculo"],
      ["pair-history", "Campaña de prueba respuestas"],
    ]) {
      await db
        .collection("campaigns")
        .doc(campaignId)
        .set({ name, status: "registration_open", defaultCapacityPerBlock: 1 });
      await db
        .collection("campaignCongregations")
        .doc(campaignId)
        .set({ campaignId, congregationId: "pair-demo-cong" });
      await db
        .collection("campaignDays")
        .doc(`${campaignId}-day`)
        .set({ campaignId, active: true, date: "2026-10-30" });
      for (const [id, startTime, endTime] of [
        ["early", "08:00", "10:00"],
        ["late", "10:00", "12:00"],
      ])
        await db
          .collection("timeBlocks")
          .doc(`${campaignId}-${id}`)
          .set({
            campaignId,
            campaignDayId: `${campaignId}-day`,
            active: true,
            startTime,
            endTime,
          });
      for (const identity of identities)
        await registrations.save(identity.token, campaignId, {
          congregationId: "pair-demo-cong",
          maxTurns: 2,
          timeBlockIds: [`${campaignId}-early`],
        });
    }
    console.info(
      "Fixtures ficticios de PairRequest listos en el emulador local.",
    );
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}
void seed().catch(() => {
  console.error("No se pudieron preparar los fixtures locales.");
  process.exitCode = 1;
});
