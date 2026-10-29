import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { getApps, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import { CampaignOrganizationService } from "../../src/modules/campaigns/server/organization-service";
import { organizationPlannerBlock, organizationPlannerBlockLabel } from "../../src/modules/campaigns/lib/organization-planner";
import { renderProgramPdf } from "../../src/modules/campaigns/server/program-pdf";
import { seedPlannerFixture, fixtureCampaign, fixtureRegistration } from "./fixture";
import { NextRequest } from "next/server";
import { POST as assignRoute } from "../../src/app/api/campanas/organization/campaigns/[campaignId]/planner/route";
import { PATCH as changeRoute } from "../../src/app/api/campanas/organization/campaigns/[campaignId]/planner/[assignmentId]/route";
import { GET as pdfRoute } from "../../src/app/api/campanas/organization/campaigns/[campaignId]/program/draft/pdf/route";

process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
process.env.CAMPAIGNS_AUTH_SECRET = "organization-planner-integration-only-secret";
process.env.CAMPAIGNS_APP_ORIGIN = "http://localhost:3000";
assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, "Only local emulators may be used");
const db = campaignsAdminDb();
const auth = new ParticipantAuthService(db, "organization-planner-integration-only-secret");
const service = new CampaignOrganizationService(db, auth);
let organizerToken: string;
let ordinaryToken: string;

before(async () => {
  await seedPlannerFixture();
  const account = (phone: string) => auth.register({ fullName: "Persona de prueba", phone, pin: "1234", confirmPin: "1234", congregationId: "cong-0" });
  const organizer = await account("+56973331111");
  const ordinary = await account("+56973332222");
  organizerToken = organizer.token;
  ordinaryToken = ordinary.token;
  const batch = db.batch();
  for (const [registrationId, participantId] of [["org-planner", organizer.participant.id], ["ordinary-planner", ordinary.participant.id]])
    batch.set(db.collection("campaignRegistrations").doc(registrationId), { campaignId: fixtureCampaign, participantId, congregationId: "cong-0", registrationStatus: "active", maxTurns: null });
  batch.set(db.collection("campaignTeams").doc(fixtureCampaign), { campaignId: fixtureCampaign, primaryRegistrationId: "org-planner", helperRegistrationIds: [] });
  await batch.commit();
});
after(async () => { for (const app of getApps()) { await getFirestore(app).terminate(); await deleteApp(app); } });

test("Organizador carga horarios y asignaciones, guarda y libera en borrador y ve PDF real", async () => {
  const initial = await service.planner(organizerToken, fixtureCampaign, "day-0");
  const block = organizationPlannerBlock(initial.blocks, "block-0");
  assert.ok(block);
  assert.equal(organizationPlannerBlockLabel(block), "08:00 – 10:00");
  assert.ok(block.available.some((person) => person.registrationId === fixtureRegistration(7)));
  await service.assignPlanner(organizerToken, fixtureCampaign, { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: fixtureRegistration(7), overrides: [] });
  const updated = await service.planner(organizerToken, fixtureCampaign, "day-0");
  const assigned = organizationPlannerBlock(updated.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0];
  assert.equal(assigned?.registrationId, fixtureRegistration(7));
  const draft = await service.draftProgram(organizerToken, fixtureCampaign);
  assert.ok(draft.snapshot.days.some((day) => day.blocks.some((item) => item.cells.some((cell) => cell.slots.some((person) => person?.registrationId === fixtureRegistration(7))))));
  assert.equal((await renderProgramPdf(draft)).subarray(0, 4).toString(), "%PDF");
  assert.equal((await db.collection("campaigns").doc(fixtureCampaign).get()).data()?.currentProgramVersionId, undefined);
  await service.changePlannerAssignment(organizerToken, fixtureCampaign, assigned!.id, { action: "cancel", expectedVersion: assigned!.version });
  const afterCancel = await service.planner(organizerToken, fixtureCampaign, "day-0");
  assert.equal(organizationPlannerBlock(afterCancel.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0], null);
});

test("Participante sin rol y otra campaña no pueden acceder al planificador", async () => {
  await assert.rejects(service.planner(ordinaryToken, fixtureCampaign), /no tiene acceso/);
  await assert.rejects(service.planner(organizerToken, "empty-draft"), /no tiene acceso/);
  await assert.rejects(service.assignPlanner(ordinaryToken, fixtureCampaign, { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: fixtureRegistration(7), overrides: [] }), /no tiene acceso/);
});

test("Ingreso manual sin cuenta y con teléfono opcional permite asignar al borrador", async () => {
  const manual = await service.addManualPlannerPerson(organizerToken, fixtureCampaign, { fullName: "Persona Manual", congregationId: "cong-0", timeBlockId: "block-0" });
  assert.equal(manual.accountCreated, false);
  await service.assignPlanner(organizerToken, fixtureCampaign, { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: manual.registrationId, overrides: [] });
  const view = await service.planner(organizerToken, fixtureCampaign, "day-0");
  assert.equal(organizationPlannerBlock(view.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0]?.person.fullName, "Persona Manual");
  const withPhone = await service.addManualPlannerPerson(organizerToken, fixtureCampaign, { fullName: "Persona Teléfono", congregationId: "cong-0", timeBlockId: "block-0", phone: "+56973334444" });
  assert.equal(withPhone.accountCreated, false);
  const person = await auth.findByPhone("+56973334444");
  assert.ok(person);
  assert.equal(person.pinHash, undefined);
});

test("Publicar es explícito y cambios posteriores no alteran la versión publicada", async () => {
  const draft = await service.draftProgram(organizerToken, fixtureCampaign);
  assert.ok(draft.plannerRevision);
  await service.publishDraft(organizerToken, fixtureCampaign, { expectedPlannerRevision: draft.plannerRevision, confirmWarnings: true, confirmBlockingErrors: true });
  const campaign = (await db.collection("campaigns").doc(fixtureCampaign).get()).data()!;
  const versionRef = db.collection("campaignProgramVersions").doc(campaign.currentProgramVersionId);
  const published = (await versionRef.get()).data()!;
  const view = await service.planner(organizerToken, fixtureCampaign, "day-0");
  const assignment = organizationPlannerBlock(view.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0]!;
  await service.changePlannerAssignment(organizerToken, fixtureCampaign, assignment.id, { action: "cancel", expectedVersion: assignment.version });
  assert.deepEqual((await versionRef.get()).data()!.snapshot, published.snapshot);
  const newDraft = await service.draftProgram(organizerToken, fixtureCampaign);
  assert.notDeepEqual(newDraft.snapshot, published.snapshot);
  assert.equal((await db.collection("campaigns").doc(fixtureCampaign).get()).data()!.currentProgramVersionId, campaign.currentProgramVersionId);
});

test("Las rutas confirman los cambios guardados y rechazan usuarios sin permiso", async () => {
  const request = (method: string, token: string, body: unknown) => new NextRequest("http://localhost:3000/api/planner", {
    method, headers: { origin: "http://localhost:3000", "content-type": "application/json", cookie: `campaign_participant_session=${token}` }, body: JSON.stringify(body),
  });
  const input = { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: fixtureRegistration(7), overrides: [] };
  const denied = await assignRoute(request("POST", ordinaryToken, input), { params: Promise.resolve({ campaignId: fixtureCampaign }) });
  assert.equal(denied.status, 403);
  const assigned = await assignRoute(request("POST", organizerToken, input), { params: Promise.resolve({ campaignId: fixtureCampaign }) });
  assert.equal(assigned.status, 200);
  assert.deepEqual(await assigned.json(), { ok: true });
  const view = await service.planner(organizerToken, fixtureCampaign, "day-0");
  const slot = organizationPlannerBlock(view.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0]!;
  assert.equal(slot.registrationId, fixtureRegistration(7));
  const removed = await changeRoute(request("PATCH", organizerToken, { action: "cancel", expectedVersion: slot.version }), { params: Promise.resolve({ campaignId: fixtureCampaign, assignmentId: slot.id }) });
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { ok: true });
  const updated = await service.planner(organizerToken, fixtureCampaign, "day-0");
  assert.equal(organizationPlannerBlock(updated.blocks, "block-0")!.points.find((p) => p.id === "point-0")!.slots[0], null);
});

test("El PDF consulta el borrador actualizado y no publica cambios", async () => {
  const request = () => new NextRequest("http://localhost:3000/api/pdf?view=1", { headers: { cookie: `campaign_participant_session=${organizerToken}` } });
  const before = await service.draftProgram(organizerToken, fixtureCampaign);
  const version = (await db.collection("campaigns").doc(fixtureCampaign).get()).data()!.currentProgramVersionId;
  await service.assignPlanner(organizerToken, fixtureCampaign, { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: fixtureRegistration(7), overrides: [] });
  const after = await service.draftProgram(organizerToken, fixtureCampaign);
  assert.notDeepEqual(after.snapshot, before.snapshot);
  const pdf = await pdfRoute(request(), { params: Promise.resolve({ campaignId: fixtureCampaign }) });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.match(pdf.headers.get("cache-control")!, /no-store/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  assert.equal((await db.collection("campaigns").doc(fixtureCampaign).get()).data()!.currentProgramVersionId, version);
});

test("Publicar sin cambios explica que el programa ya está actualizado", async () => {
  const draft = await service.draftProgram(organizerToken, fixtureCampaign);
  await service.publishDraft(organizerToken, fixtureCampaign, { expectedPlannerRevision: draft.plannerRevision, confirmWarnings: true, confirmBlockingErrors: true });
  const current = await service.draftProgram(organizerToken, fixtureCampaign);
  await assert.rejects(service.publishDraft(organizerToken, fixtureCampaign, { expectedPlannerRevision: current.plannerRevision, confirmWarnings: true, confirmBlockingErrors: true }), /ya está actualizado/);
});
