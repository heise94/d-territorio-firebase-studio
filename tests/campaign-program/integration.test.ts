import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { before, beforeEach, after, test } from "node:test";
import { getApps, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { NextRequest } from "next/server";
import {
  campaignsAdminDb,
  campaignsAdminApp,
} from "../../src/modules/campaigns/server/firebase-admin";
import {
  getProgram,
  publishProgram,
  getPersonalProgram,
  programVersionId,
  ProgramValidationError,
} from "../../src/modules/campaigns/server/program-service";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import { participantAuth } from "../../src/modules/campaigns/server/auth/session";
import { tokenHash } from "../../src/modules/campaigns/server/auth/crypto";
import { publicationConflictMessage } from "../../src/modules/campaigns/domain/program";
import { canTransitionCampaignStatus } from "../../src/modules/campaigns/domain/campaign-status";
import {
  createAssignment,
  setBlockPoint,
  changePlannerStatus,
  getPlanner,
} from "../../src/modules/campaigns/server/planner-service";
import { blockPointId } from "../../src/modules/campaigns/server/planner-source";
import {
  renderProgramPdf,
  programPdfFilename,
} from "../../src/modules/campaigns/server/program-pdf";
import { GET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/program/route";
import { POST } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/publish/route";
import { GET as pdfGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/program/pdf/route";
import { GET as personalGET } from "../../src/app/api/campanas/participant/my-program/route";
import {
  seedProgramFixture,
  fixtureCampaign as campaign,
  fixtureRegistration as reg,
} from "./fixture";
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
);
const db = campaignsAdminDb();
let env: RulesTestEnvironment,
  token: string,
  secondToken: string,
  ordinaryToken: string,
  cookies: Record<number, string>;
const denied = (status: number) => (e: unknown) =>
  e instanceof AuthError && e.status === status;
const context = () => ({ params: Promise.resolve({ campaignId: campaign }) });
const request = (
  suffix: string,
  credential: string | undefined = token,
  body?: unknown,
) =>
  new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/${suffix}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
        Cookie: `campaign_participant_session=${cookies[0]}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
const personalRequest = (cookie = cookies[0], query = "") =>
  new NextRequest(
    `http://localhost/api/campanas/participant/my-program${query}`,
    { headers: { Cookie: `campaign_participant_session=${cookie}` } },
  );
const input = async () => ({
  expectedPlannerRevision: (await getProgram(token, campaign)).plannerRevision,
  confirmWarnings: true,
});
const publish = async () => publishProgram(token, campaign, await input());
const updateAssignment = (id: string, data: Record<string, unknown>) =>
  db.collection("campaignAssignments").doc(id).update(data);
const hasError = async (code: string) =>
  assert.ok(
    (await getProgram(token, campaign)).blockingErrors.some(
      (e) => e.code === code,
    ),
    code,
  );
const pdfPageCount = (bytes: Buffer) =>
  [...bytes.toString("latin1").matchAll(/\/Type \/Page\b/g)].length;
const pdfSubject = (bytes: Buffer) => {
  const raw = bytes.toString("latin1");
  const reference = /\/Subject (\d+) 0 R/.exec(raw)?.[1];
  const encoded = reference
    ? new RegExp(`${reference} 0 obj\\s*\\(([^]*?)\\)\\s*endobj`).exec(raw)?.[1]
    : undefined;
  assert.ok(encoded, "PDF Subject metadata must be present");
  return Buffer.from(encoded, "latin1")
    .swap16()
    .toString("utf16le")
    .replace(/^\uFEFF/, "");
};
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-campaign-auth",
    firestore: {
      host,
      port: Number(port),
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  ({ token, secondToken, ordinaryToken, cookies } = await seedProgramFixture());
});
after(async () => {
  await env.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
test("80 participantes, tres días, cuatro congregaciones y unión estable de ocho puntos", async () => {
  const view = await getProgram(token, campaign);
  assert.equal(
    (
      await db
        .collection("campaignRegistrations")
        .where("campaignId", "==", campaign)
        .get()
    ).size,
    80,
  );
  assert.equal(view.snapshot.days.length, 3);
  assert.deepEqual(
    view.snapshot.days.map((d) => d.date),
    ["2026-10-30", "2026-10-31", "2026-11-01"],
  );
  assert.ok(view.snapshot.days.every((d) => d.points.length === 8));
  assert.equal(view.blockingErrors.length, 0);
});
test("Bloques cronológicos, columnas independientes de cantidad asignada", async () => {
  const view = await getProgram(token, campaign);
  const day = view.snapshot.days[0];
  assert.deepEqual(
    day.blocks.map((b) => b.startTime),
    ["08:00", "10:00", "12:00"],
  );
  assert.deepEqual(
    day.points.map((p) => p.id),
    Array.from({ length: 8 }, (_, i) => `point-${i}`),
  );
});
test("3/5/8 activos, No activo y dos posiciones Pendiente sin inventar asignaciones", async () => {
  const day = (await getProgram(token, campaign)).snapshot.days[0];
  assert.deepEqual(
    day.blocks.map((b) => b.cells.filter((c) => c.active).length),
    [3, 5, 8],
  );
  assert.equal(day.blocks[0].cells[7].active, false);
  assert.deepEqual(day.blocks[1].cells[4].slots, [null, null]);
  assert.equal(
    day.blocks[0].cells[0].slots[0]?.fullName,
    "José Álvarez Ficticio",
  );
});
test("Advertencias de puntos vacíos, incompletos y dos excepciones autorizadas", async () => {
  const view = await getProgram(token, campaign);
  for (const code of [
    "empty_point",
    "incomplete_point",
    "availability_override",
    "max_turns_override",
  ])
    assert.ok(
      view.warnings.some((w) => w.code === code),
      code,
    );
  assert.equal(view.blockingErrors.length, 0);
});
test("Detalle incluye día, hora, punto y persona sin teléfono ni PIN", async () => {
  const view = await getProgram(token, campaign);
  const issue = view.warnings.find((w) => w.code === "availability_override")!;
  assert.equal(issue.date, "2026-10-30");
  assert.equal(issue.hours, "12:00–14:00");
  assert.ok(issue.point);
  assert.ok(issue.person);
  assert.doesNotMatch(
    JSON.stringify(view),
    /phone|pinHash|sessionVersion|SENSITIVE_SENTINEL|40000000/,
  );
});
for (const [label, mutation, code] of [
  [
    "persona duplicada",
    async () => {
      const original = (
        await db.collection("campaignAssignments").doc("ordinary-a").get()
      ).data()!;
      await db
        .collection("campaignAssignments")
        .doc("duplicate")
        .set({ ...original, pointId: "point-2", slotNumber: 2 });
    },
    "duplicate_person",
  ],
  [
    "posición duplicada",
    async () =>
      updateAssignment("ordinary-a", { pointId: "point-0", slotNumber: 1 }),
    "duplicate_slot",
  ],
  [
    "pareja incompleta",
    async () => updateAssignment("accepted-b", { status: "cancelled" }),
    "separated_pair",
  ],
  [
    "pareja separada de punto",
    async () => updateAssignment("accepted-b", { pointId: "point-1" }),
    "separated_pair",
  ],
  [
    "pareja separada de bloque",
    async () => updateAssignment("accepted-b", { timeBlockId: "block-1" }),
    "separated_pair",
  ],
  [
    "pareja en misma posición",
    async () => updateAssignment("accepted-b", { slotNumber: 1 }),
    "separated_pair",
  ],
  [
    "día inactivo",
    async () =>
      db.collection("campaignDays").doc("day-0").update({ active: false }),
    "invalid_assignment",
  ],
  [
    "bloque inactivo",
    async () =>
      db.collection("timeBlocks").doc("block-0").update({ active: false }),
    "invalid_assignment",
  ],
  [
    "bloque eliminado",
    async () => db.collection("timeBlocks").doc("block-0").delete(),
    "invalid_assignment",
  ],
  [
    "punto inactivo",
    async () =>
      db.collection("points").doc("point-0").update({ active: false }),
    "invalid_assignment",
  ],
  [
    "punto eliminado",
    async () => db.collection("points").doc("point-0").delete(),
    "invalid_assignment",
  ],
  [
    "BlockPoint inactivo",
    async () =>
      db
        .collection("blockPoints")
        .doc(blockPointId("block-0", "point-0"))
        .update({ active: false }),
    "invalid_assignment",
  ],
  [
    "BlockPoint eliminado",
    async () =>
      db
        .collection("blockPoints")
        .doc(blockPointId("block-0", "point-0"))
        .delete(),
    "invalid_assignment",
  ],
  [
    "inscripción retirada",
    async () =>
      db
        .collection("campaignRegistrations")
        .doc(reg(0))
        .update({ registrationStatus: "withdrawn" }),
    "invalid_assignment",
  ],
  [
    "inscripción eliminada",
    async () => db.collection("campaignRegistrations").doc(reg(0)).delete(),
    "invalid_assignment",
  ],
  [
    "perfil inactivo",
    async () =>
      db.collection("participants").doc("person-0").update({ active: false }),
    "invalid_assignment",
  ],
  [
    "asignación extranjera",
    async () => updateAssignment("ordinary-a", { pointId: "foreign-point" }),
    "invalid_assignment",
  ],
  [
    "inscripción extranjera",
    async () =>
      db
        .collection("campaignRegistrations")
        .doc(reg(0))
        .update({ campaignId: "empty-draft" }),
    "invalid_assignment",
  ],
  [
    "posición inválida",
    async () => updateAssignment("ordinary-a", { slotNumber: 3 }),
    "invalid_assignment",
  ],
  [
    "sin disponibilidad ni override",
    async () =>
      updateAssignment("availability", { availabilityOverride: false }),
    "unavailable",
  ],
  [
    "exceso sin override",
    async () => updateAssignment("limit-extra", { maxTurnsOverride: false }),
    "max_turns",
  ],
] as const)
  test(`Bloquea ${label}`, async () => {
    await mutation();
    await hasError(code);
    await assert.rejects(
      publish(),
      (e) =>
        e instanceof ProgramValidationError &&
        e.view.blockingErrors.some((i) => i.code === code),
    );
    assert.equal(
      (await db.collection("campaignProgramVersions").get()).size,
      0,
    );
  });
test("Parejas aceptadas múltiples o referencias ocultas del dashboard bloquean", async () => {
  await db
    .collection("pairRequests")
    .doc("invalid-pair")
    .set({
      campaignId: campaign,
      status: "accepted",
      requesterRegistrationId: reg(0),
      recipientRegistrationId: "foreign-reg",
    });
  await hasError("corrupt_pair");
});
test("Pareja aceptada enteramente sin asignar permanece en reserva", async () => {
  await updateAssignment("accepted-a", { status: "cancelled" });
  await updateAssignment("accepted-b", { status: "cancelled" });
  assert.equal((await getProgram(token, campaign)).blockingErrors.length, 0);
  await publish();
});
for (const [name, collectionName, code] of [
  ["días", "campaignDays", "no_days"],
  ["bloques", "timeBlocks", "no_blocks"],
  ["puntos", "blockPoints", "no_points"],
  ["asignaciones", "campaignAssignments", "no_assignments"],
] as const)
  test(`No permite publicar sin ${name}`, async () => {
    const docs = await db
      .collection(collectionName)
      .where("campaignId", "==", campaign)
      .get();
    const batch = db.batch();
    docs.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await hasError(code);
  });
test("Advertencias requieren confirmación explícita, sin escrituras parciales", async () => {
  const data = await input();
  await assert.rejects(
    publishProgram(token, campaign, { ...data, confirmWarnings: false }),
    (e) => e instanceof ProgramValidationError && e.view.warnings.length > 0,
  );
  assert.equal(
    (await db.collection("campaigns").doc(campaign).get()).data()?.status,
    "planning",
  );
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 0);
});
test("Publicación v1: UID real, timestamp, estado, assignments y cancelled intacto", async () => {
  const cancelled = (
    await db.collection("campaignAssignments").doc("cancelled-history").get()
  ).data();
  const view = await publish();
  const version = (
    await db
      .collection("campaignProgramVersions")
      .doc(programVersionId(campaign))
      .get()
  ).data()!;
  assert.equal(view.mode, "published");
  assert.equal(view.version, 1);
  assert.equal(view.campaignStatus, "published");
  assert.equal(version.publishedBy, "dashboard-organizer");
  assert.equal(version.status, "published");
  assert.ok(version.publishedAt instanceof Timestamp);
  assert.ok(version.createdAt);
  const campaignData = (
    await db.collection("campaigns").doc(campaign).get()
  ).data()!;
  assert.equal(campaignData.currentProgramVersionId, version.id);
  assert.equal(campaignData.programVersion, 1);
  assert.equal(
    campaignData.publishedAt.toMillis(),
    version.publishedAt.toMillis(),
  );
  const assignments = (await db.collection("campaignAssignments").get()).docs;
  for (const doc of assignments.filter((d) => d.id !== "cancelled-history")) {
    assert.equal(doc.data().status, "published");
    assert.equal(doc.data().version, 2);
  }
  assert.deepEqual(
    (
      await db.collection("campaignAssignments").doc("cancelled-history").get()
    ).data(),
    cancelled,
  );
  assert.equal(
    (await db.collection("campaignAssignments").doc("limit-extra").get()).data()
      ?.maxTurnsOverride,
    true,
  );
});
test("Auditoría mínima y transición dedicada sin habilitar estados posteriores", async () => {
  await publish();
  const docs = await db
    .collection("auditLogs")
    .where("action", "==", "program_published")
    .get();
  assert.equal(docs.size, 1);
  const audit = docs.docs[0].data();
  assert.equal(audit.actorId, "dashboard-organizer");
  assert.equal(audit.campaignId, campaign);
  assert.equal(audit.metadata.assignmentCount, 8);
  assert.equal(audit.metadata.version, 1);
  assert.ok(audit.metadata.programVersionId);
  assert.ok(audit.metadata.publishedAt);
  assert.doesNotMatch(JSON.stringify(audit), /fullName|phone|pin|José/);
  assert.ok(
    canTransitionCampaignStatus("planning", "published", "publication"),
  );
  assert.equal(canTransitionCampaignStatus("planning", "published"), false);
  assert.equal(canTransitionCampaignStatus("published", "planning"), false);
  assert.equal(canTransitionCampaignStatus("published", "active"), false);
  assert.equal(canTransitionCampaignStatus("active", "completed"), false);
  await assert.rejects(
    changePlannerStatus(token, campaign, { status: "published" }),
    denied(400),
  );
});
test("expectedPlannerRevision inválido, desconocidos e identidad no son payload válido", async () => {
  for (const data of [
    {},
    { expectedPlannerRevision: 0 },
    { ...(await input()), id: "fake" },
    { ...(await input()), publishedBy: "fake" },
  ])
    await assert.rejects(publishProgram(token, campaign, data), denied(400));
});
test("Cambio de revision del planner produce 409 exacto", async () => {
  const data = await input();
  await db
    .collection("campaignPlannerLocks")
    .doc(campaign)
    .set({ revision: 1 });
  await assert.rejects(
    publishProgram(token, campaign, data),
    (e) =>
      e instanceof AuthError &&
      e.status === 409 &&
      e.message === publicationConflictMessage,
  );
});
test("Cambios de perfil/configuración sin lock invalidan preview", async () => {
  const data = await input();
  await db
    .collection("participants")
    .doc("person-0")
    .update({ fullName: "Nuevo nombre" });
  await assert.rejects(publishProgram(token, campaign, data), denied(409));
});
test("Dos organizadores simultáneos: una sola v1 y una sola auditoría", async () => {
  const data = await input();
  const results = await Promise.allSettled([
    publishProgram(token, campaign, data),
    publishProgram(secondToken, campaign, data),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 409);
  assert.equal(rejected.reason.message, publicationConflictMessage);
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 1);
  assert.equal(
    (
      await db
        .collection("auditLogs")
        .where("action", "==", "program_published")
        .get()
    ).size,
    1,
  );
});
test("No segunda publicación, ni nuevo snapshot, ni v2/v3", async () => {
  const data = await input();
  await publishProgram(token, campaign, data);
  await assert.rejects(publishProgram(token, campaign, data), denied(409));
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 1);
});
test("registration_open no permite publicar aunque preview sea válido", async () => {
  await db
    .collection("campaigns")
    .doc(campaign)
    .update({ status: "registration_open" });
  await assert.rejects(publish(), denied(409));
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 0);
});
test("Una persona duplicada en dos inscripciones del mismo bloque bloquea", async () => {
  await db
    .collection("campaignRegistrations")
    .doc(reg(3))
    .update({ participantId: "person-0" });
  await hasError("duplicate_person");
});
test("sortOrder, nombre e ID desempatan columnas sin cambiar entre filas", async () => {
  await db
    .collection("points")
    .doc("point-1")
    .update({ sortOrder: 0, name: "A" });
  const day = (await getProgram(token, campaign)).snapshot.days[0];
  assert.deepEqual(
    day.points.slice(0, 2).map((p) => p.id),
    ["point-1", "point-0"],
  );
  assert.ok(day.blocks.every((b) => b.cells[0].pointId === "point-1"));
});
test("Cambio de horario/configuración invalidan publicación obsoleta", async () => {
  const data = await input();
  await db
    .collection("timeBlocks")
    .doc("block-0")
    .update({ label: "Nuevo bloque" });
  await assert.rejects(publishProgram(token, campaign, data), denied(409));
});
test("POST rechaza origen cruzado, body inválido y payloads manuales", async () => {
  const req = new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: "https://foreign.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await input()),
    },
  );
  assert.equal((await POST(req, context())).status, 403);
  assert.equal(
    (
      await POST(
        request("publish", token, { snapshot: {}, ...(await input()) }),
        context(),
      )
    ).status,
    400,
  );
});
test("Cookie expirada es rechazada por validación real dentro de la transacción", async () => {
  await db
    .collection("deviceSessions")
    .doc(tokenHash(cookies[0]))
    .update({ expiresAt: Timestamp.fromMillis(1) });
  await assert.rejects(getPersonalProgram(cookies[0]), denied(401));
});
test("Publicado no relee perfiles/puntos/horarios vivos y Mi programa también es inmutable", async () => {
  const official = await publish(),
    own = await getPersonalProgram(cookies[0]);
  const originalPdf = await renderProgramPdf(official);
  const batch = db.batch();
  batch.update(db.collection("participants").doc("person-0"), {
    fullName: "Nombre cambiado",
  });
  batch.update(db.collection("participants").doc("person-1"), {
    fullName: "Compañero cambiado",
  });
  batch.update(db.collection("points").doc("point-0"), {
    name: "Punto cambiado",
    locationText: "Lugar cambiado",
  });
  batch.update(db.collection("timeBlocks").doc("block-0"), {
    startTime: "05:00",
    endTime: "06:00",
    label: "Cambiado",
  });
  batch.update(db.collection("campaigns").doc(campaign), {
    name: "Campaña cambiada",
  });
  await batch.commit();
  assert.deepEqual(await getProgram(token, campaign), official);
  assert.deepEqual(await getPersonalProgram(cookies[0]), own);
  assert.deepEqual(
    await renderProgramPdf(await getProgram(token, campaign)),
    originalPdf,
  );
});
test("Planificador publicado conserva posiciones pero toda mutación está bloqueada", async () => {
  await publish();
  const planner = await getPlanner(token, campaign, "block-0");
  assert.equal(planner.mutable, false);
  assert.equal(planner.metrics.assigned, 6);
  await assert.rejects(
    createAssignment(token, campaign, {
      registrationId: reg(7),
      timeBlockId: "block-0",
      pointId: "point-0",
      slotNumber: 1,
    }),
    denied(409),
  );
  await assert.rejects(
    setBlockPoint(token, campaign, {
      timeBlockId: "block-0",
      pointId: "point-7",
      active: true,
    }),
    denied(409),
  );
});
test("Mi programa planning no expone ningún turno del borrador", async () => {
  const view = await getPersonalProgram(cookies[0]);
  assert.equal(view.campaigns[0].published, false);
  assert.deepEqual(view.campaigns[0].turns, []);
  assert.doesNotMatch(JSON.stringify(view), /José|point-|08:00/);
});
test("Mi programa deriva inscripción propia y solo muestra compañero del punto propio", async () => {
  await publish();
  const view = await getPersonalProgram(cookies[0]);
  assert.equal(view.campaigns[0].turns.length, 1);
  const turn = view.campaigns[0].turns[0];
  assert.equal(turn.date, "2026-10-30");
  assert.equal(turn.startTime, "08:00");
  assert.equal(turn.pointName, "Punto ficticio 1");
  assert.equal(turn.locationText, "Ubicación ficticia 1");
  assert.equal(turn.companionName, "Participante ficticio 01");
  assert.doesNotMatch(
    JSON.stringify(view),
    /reg-|person-|assignmentId|registrationId|phone|pinHash|Participante ficticio 03|Punto ficticio 8/,
  );
});
test("Sin turnos publicados devuelve lista vacía, no otros participantes", async () => {
  await publish();
  const view = await getPersonalProgram(cookies[7]);
  assert.equal(view.campaigns[0].published, true);
  assert.deepEqual(view.campaigns[0].turns, []);
});
test("Mi programa nunca sirve una versión cuyo status no sea published", async () => {
  await publish();
  await db
    .collection("campaignProgramVersions")
    .doc(programVersionId(campaign))
    .update({ status: "draft" });
  await assert.rejects(getPersonalProgram(cookies[0]), denied(503));
  await assert.rejects(getProgram(token, campaign), denied(503));
});
test("Cookie missing/inválida/revocada/perfil inactivo/sesión invalidada devuelve 401", async () => {
  await assert.rejects(getPersonalProgram(""), denied(401));
  await assert.rejects(getPersonalProgram("fake"), denied(401));
  await db
    .collection("deviceSessions")
    .doc(tokenHash(cookies[0]))
    .update({ revokedAt: Timestamp.now() });
  await assert.rejects(getPersonalProgram(cookies[0]), denied(401));
  await db.collection("participants").doc("person-1").update({ active: false });
  await assert.rejects(getPersonalProgram(cookies[1]), denied(401));
  await db
    .collection("participants")
    .doc("person-7")
    .update({ sessionVersion: 1 });
  await assert.rejects(getPersonalProgram(cookies[7]), denied(401));
});
test("Parámetros participantId/registrationId ajenos rechazados sin aceptar identidad", async () => {
  await publish();
  for (const query of ["?participantId=person-1", "?registrationId=reg-01"]) {
    const response = await personalGET(personalRequest(cookies[0], query));
    assert.equal(response.status, 400);
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
});
test("Identidad real puede ingresar con PIN; autorización personal no usa Firebase admin", async () => {
  const result = await participantAuth().login({
    phone: "+56940000000",
    pin: "638251",
  });
  assert.equal(result.participant.id, "person-0");
  assert.equal(
    (await getPersonalProgram(result.token)).campaigns[0].published,
    false,
  );
});
test("Todas las APIs admin niegan missing/cookie-only/invalid token/no claim", async () => {
  for (const credential of ["", "invalid", ordinaryToken]) {
    for (const route of [GET, pdfGET]) {
      const response = await route(request("program", credential), context());
      assert.equal(response.status, credential === ordinaryToken ? 403 : 401);
      assert.match(response.headers.get("cache-control")!, /no-store/);
    }
    const response = await POST(
      request("publish", credential, await input()),
      context(),
    );
    assert.equal(response.status, credential === ordinaryToken ? 403 : 401);
  }
});
test("Claim retirado aunque token antiguo tenga claim deniega 403", async () => {
  await getAuth(campaignsAdminApp()).setCustomUserClaims(
    "dashboard-organizer",
    {},
  );
  await assert.rejects(getProgram(token, campaign), denied(403));
  await assert.rejects(
    publishProgram(token, campaign, {
      expectedPlannerRevision: "a".repeat(64),
    }),
    denied(403),
  );
});
test("Admin deshabilitado no lee ni publica", async () => {
  await getAuth(campaignsAdminApp()).updateUser("dashboard-organizer", {
    disabled: true,
  });
  await assert.rejects(getProgram(token, campaign), denied(401));
});
test("Admin revocado rechaza token antiguo en programa y publicación", async () => {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await getAuth(campaignsAdminApp()).revokeRefreshTokens("dashboard-organizer");
  await assert.rejects(getProgram(token, campaign), denied(401));
  await assert.rejects(
    publishProgram(token, campaign, {
      expectedPlannerRevision: "a".repeat(64),
    }),
    denied(401),
  );
});
test("Overrides requieren boolean true: strings truthy no autorizan", async () => {
  await updateAssignment("availability", { availabilityOverride: "true" });
  await updateAssignment("limit-extra", { maxTurnsOverride: "true" });
  await hasError("unavailable");
  await hasError("max_turns");
});
test("Nombres largos y acentos con ocho puntos mantienen páginas razonables", async () => {
  await db.collection("participants").doc("person-0").update({
    fullName:
      "María José Fernández de los Ángeles Rodríguez Valdés Participante Ficticia de Prueba",
  });
  await db
    .collection("points")
    .doc("point-0")
    .update({
      name: "Punto peatonal ficticio de la plaza principal de la localidad",
    });
  const bytes = await renderProgramPdf(await getProgram(token, campaign));
  assert.ok(pdfPageCount(bytes) >= 6 && pdfPageCount(bytes) <= 12);
  await writeFile("/tmp/campaign-phase7-pdf/long-names.pdf", bytes);
});
test("Rules niegan get/list/write ProgramVersions incluso campaign_admin", async () => {
  await publish();
  for (const auth of [
    env.unauthenticatedContext(),
    env.authenticatedContext("ordinary"),
    env.authenticatedContext("dashboard-organizer", { campaign_admin: true }),
  ]) {
    const client = auth.firestore();
    await assertFails(
      getDoc(
        doc(client, "campaignProgramVersions", programVersionId(campaign)),
      ),
    );
    await assertFails(getDocs(collection(client, "campaignProgramVersions")));
    await assertFails(
      setDoc(doc(client, "campaignProgramVersions", "fake"), {
        campaignId: campaign,
      }),
    );
  }
});
test("GET personal sin cookie devuelve 401 incluso bearer admin; respuestas privadas", async () => {
  const noCookie = new NextRequest(
    "http://localhost/api/campanas/participant/my-program",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal((await personalGET(noCookie)).status, 401);
  const response = await personalGET(personalRequest());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")!, /private, no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
});
test("PDF descargable protegido: application/pdf, filename borrador/v1, válido y sin teléfonos", async () => {
  const draft = await pdfGET(request("program/pdf"), context());
  assert.equal(draft.status, 200);
  assert.equal(draft.headers.get("content-type"), "application/pdf");
  assert.match(draft.headers.get("content-disposition")!, /-borrador.pdf/);
  const draftBytes = Buffer.from(await draft.arrayBuffer());
  assert.match(draftBytes.subarray(0, 8).toString(), /%PDF-/);
  assert.ok(draftBytes.length > 10000);
  const dir = "/tmp/campaign-phase7-pdf";
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/draft.pdf`, draftBytes);
  assert.equal(pdfSubject(draftBytes), "BORRADOR — NO DISTRIBUIR");
  await publish();
  const response = await pdfGET(request("program/pdf"), context());
  assert.match(response.headers.get("content-disposition")!, /-v1.pdf/);
  assert.match(response.headers.get("cache-control")!, /private, no-store/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.notDeepEqual(bytes, draftBytes);
  await writeFile(`${dir}/published.pdf`, bytes);
  assert.match(pdfSubject(bytes), /Publicado · v1/);
  assert.doesNotMatch(pdfSubject(bytes), /BORRADOR/);
  assert.equal(pdfPageCount(bytes), 6);
  assert.match(bytes.toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/);
  assert.match(
    programPdfFilename(await getProgram(token, campaign)),
    /^campana-.*-v1.pdf$/,
  );
});
