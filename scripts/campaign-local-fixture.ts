import assert from "node:assert/strict";
import { getAuth } from "firebase-admin/auth";
import { getApps, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../src/modules/campaigns/server/firebase-admin";
import {
  seedPlannerFixture,
  fixtureCampaign,
  fixtureRegistration,
  fixturePassword,
} from "../tests/campaign-planner/fixture";
import { createAssignment } from "../src/modules/campaigns/server/planner-service";
import {
  getProgram,
  publishProgram,
} from "../src/modules/campaigns/server/program-service";

async function main() {
  assert.equal(process.env.FIREBASE_ADMIN_PROJECT_ID, "demo-campaign-auth");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8088");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  const db = campaignsAdminDb();
  assert.equal(
    (await db.collection("campaigns").get()).size,
    0,
    "Use a fresh local emulator; never replace existing fixtures",
  );
  const { token } = await seedPlannerFixture();
  const auth = getAuth(campaignsAdminApp());
  await auth.setCustomUserClaims("dashboard-organizer", {
    campaign_admin: true,
    super_admin: true,
  });
  await auth.createUser({
    uid: "local-responsible",
    email: "responsible-local@example.test",
    password: fixturePassword,
  });
  await auth.setCustomUserClaims("local-responsible", { campaign_admin: true });
  await db
    .collection("users")
    .doc("local-responsible")
    .set({
      firebaseAuthUid: "local-responsible",
      name: "Responsable MAQUEHUE — NO REAL",
      email: "responsible-local@example.test",
      role: "Encargado Territorio",
      status: "Activo",
    });
  await db
    .collection("organizerUsers")
    .doc("local-responsible")
    .set({
      uid: "local-responsible",
      role: "CONGREGATION_RESPONSIBLE",
      campaignId: fixtureCampaign,
      congregationId: "cong-0",
      active: true,
    });
  const information = {
    intro:
      "LOCAL UX REVIEW — NO REAL. Información ficticia para validación visual.",
    generalMapUrl: "https://maps.google.com/?q=Temuco",
    pickup: {
      location: "Bodega ficticia",
      schedule: "Viernes 30 · 07:30–08:00",
      instructions: "Retira el exhibidor con anticipación.",
      mapUrl: "https://maps.google.com/?q=Temuco",
    },
    returnInfo: {
      location: "Bodega ficticia",
      schedule: "Sábado 31 · 18:00–19:00",
      instructions: "Devuelve el exhibidor completo.",
      mapUrl: "https://maps.google.com/?q=Temuco",
    },
    contacts: [
      {
        name: "Coordinador ficticio",
        role: "Equipo organizador",
        phone: "+56940009999",
        allowCall: true,
        allowWhatsApp: true,
      },
    ],
    notes: [
      {
        title: "Llega con anticipación",
        body: "Ubica tu punto y revisa tu turno antes de comenzar.",
      },
    ],
  };
  await db
    .collection("campaigns")
    .doc(fixtureCampaign)
    .update({
      name: "LOCAL UX REVIEW — NO REAL",
      description:
        "Campaña de prueba local · 80 participantes y cuatro congregaciones",
      locationName: "Temuco — lugar ficticio",
      information,
    });
  for (const [index, name] of [
    "MAQUEHUE",
    "HUICHAHUE",
    "MAPUDUNGÚN",
    "PULMAHUE",
  ].entries())
    await db.collection("congregations").doc(`cong-${index}`).update({ name });
  for (const name of ["campaignDays", "timeBlocks", "points"]) {
    const rows = await db
      .collection(name)
      .where("campaignId", "==", fixtureCampaign)
      .get();
    for (const [index, doc] of rows.docs.entries())
      await doc.ref.update({ sortOrder: index });
  }
  for (const [index, pointId, slotNumber] of [
    [0, "point-0", 1],
    [3, "point-1", 1],
    [4, "point-1", 2],
    [5, "point-2", 1],
  ] as const) {
    await createAssignment(token, fixtureCampaign, {
      registrationId: fixtureRegistration(index),
      timeBlockId: "block-0",
      pointId,
      slotNumber,
      overrides: [],
    });
  }
  // Copy campaign-owned data with new opaque IDs, keeping global profiles shared.
  const publishedId = "local-published";
  const collections = [
    "campaignDays",
    "timeBlocks",
    "campaignCongregations",
    "campaignRegistrations",
    "availabilities",
    "pairRequests",
    "points",
    "blockPoints",
    "campaignAssignments",
  ];
  const snapshots = await Promise.all(
    collections.map((name) =>
      db.collection(name).where("campaignId", "==", fixtureCampaign).get(),
    ),
  );
  const ids = new Map<string, string>([[fixtureCampaign, publishedId]]);
  snapshots.forEach((snapshot) =>
    snapshot.docs.forEach((doc) => ids.set(doc.id, `published-${doc.id}`)),
  );
  await db
    .collection("campaigns")
    .doc(publishedId)
    .set({
      ...(await db.collection("campaigns").doc(fixtureCampaign).get()).data(),
      name: "LOCAL PUBLICADO — NO REAL",
    });
  const copies = db.batch();
  snapshots.forEach((snapshot, index) =>
    snapshot.docs.forEach((doc) => {
      const data = Object.fromEntries(
        Object.entries(doc.data()).map(([key, value]) => [
          key,
          typeof value === "string" && ids.has(value) ? ids.get(value)! : value,
        ]),
      );
      copies.set(db.collection(collections[index]).doc(ids.get(doc.id)!), data);
    }),
  );
  await copies.commit();
  const program = await getProgram(token, publishedId);
  await publishProgram(token, publishedId, {
    expectedPlannerRevision: program.plannerRevision,
    confirmWarnings: true,
  });
  const publishedAssignment = (
    await db
      .collection("campaignAssignments")
      .where("campaignId", "==", publishedId)
      .get()
  ).docs.find((doc) => doc.data().registrationId === "published-reg-03")!;
  const now = Timestamp.now();
  await db
    .collection("changeRequests")
    .doc("local-change")
    .set({
      campaignId: publishedId,
      registrationId: "published-reg-03",
      participantId: "person-3",
      assignmentId: publishedAssignment.id,
      sourceProgramVersionId: `${publishedId}__v1`,
      sourceProgramVersion: 1,
      status: "pending",
      reasonCode: "schedule_conflict",
      comment: "Comentario ficticio para revisar la interfaz.",
      organizerResponse: "",
      createdAt: now,
      updatedAt: now,
    });
  // Private review states are set after the published fixture has been cloned.
  for (const [index, status] of [
    [8, "pending"],
    [12, "not_approved"],
    [16, "pending"],
    [20, "approved"],
  ] as const)
    await db
      .collection("campaignRegistrations")
      .doc(fixtureRegistration(index))
      .update({ approvalStatus: status });
  console.log(
    "Local fixtures ready: dashboard-80 (planning), local-published (v1), MAQUEHUE review. No real data.",
  );
}
main().finally(async () => {
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
