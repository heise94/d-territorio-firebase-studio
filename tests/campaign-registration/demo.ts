/** Disposable local fixtures for the browser walkthrough; never connect to production. */
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import { CampaignRegistrationService } from "../../src/modules/campaigns/server/registration-service";

async function seed() {
  assert.equal(
    process.env.FIRESTORE_EMULATOR_HOST,
    "127.0.0.1:8088",
    "Local emulator required",
  );
  const app = initializeApp(
    { projectId: "demo-campaign-auth" },
    "registration-browser-demo",
  );
  const db = getFirestore(app);
  try {
    await db
      .collection("congregations")
      .doc("demo-congregation")
      .set({ name: "Congregación de prueba", active: true });
    await db
      .collection("campaigns")
      .doc("demo-campaign")
      .set({
        name: "Campaña de prueba local",
        description: "Datos ficticios para probar disponibilidad.",
        status: "registration_open",
        defaultCapacityPerBlock: 4,
      });
    await db
      .collection("campaignCongregations")
      .doc("demo-association")
      .set({
        campaignId: "demo-campaign",
        congregationId: "demo-congregation",
      });
    await db
      .collection("campaignDays")
      .doc("demo-day")
      .set({ campaignId: "demo-campaign", date: "2026-10-30", active: true });
    await db
      .collection("timeBlocks")
      .doc("demo-full")
      .set({
        campaignId: "demo-campaign",
        campaignDayId: "demo-day",
        startTime: "08:00",
        endTime: "10:00",
        capacityOverride: 1,
        active: true,
      });
    await db
      .collection("timeBlocks")
      .doc("demo-support")
      .set({
        campaignId: "demo-campaign",
        campaignDayId: "demo-day",
        startTime: "10:00",
        endTime: "12:00",
        active: true,
      });
    const auth = new ParticipantAuthService(
      db,
      "integration-test-only-secret-not-production",
    );
    const profile = (fullName: string, phone: string) => ({
      fullName,
      phone,
      pin: "1234",
      confirmPin: "1234",
      congregationId: "demo-congregation",
    });
    await auth.register(profile("Participante ficticio A", "913111114"));
    const b = await auth.register(
      profile("Participante ficticio B", "913111115"),
    );
    await new CampaignRegistrationService(db, auth).save(
      b.token,
      "demo-campaign",
      {
        congregationId: "demo-congregation",
        maxTurns: 1,
        timeBlockIds: ["demo-full"],
      },
    );
    console.info("Fixtures ficticios listos en el emulador local.");
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}
void seed().catch(() => {
  console.error("No se pudieron preparar los fixtures locales.");
  process.exitCode = 1;
});
