import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { getApps, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { NextRequest } from "next/server";
import {
  campaignsAdminDb,
  campaignsAdminApp,
} from "../../src/modules/campaigns/server/firebase-admin";
import {
  getProgram,
  getPersonalProgram,
  publishProgram,
} from "../../src/modules/campaigns/server/program-service";
import {
  createChangeRequest,
  participantChanges,
} from "../../src/modules/campaigns/server/change-request-participant";
import {
  adminChanges,
  decideChange,
  previewResolution,
  resolveChange,
} from "../../src/modules/campaigns/server/change-request-admin";
import { participantNotifications } from "../../src/modules/campaigns/server/change-notifications";
import { turnId } from "../../src/modules/campaigns/server/change-request-context";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import { tokenHash } from "../../src/modules/campaigns/server/auth/crypto";
import {
  renderProgramPdf,
  programPdfFilename,
} from "../../src/modules/campaigns/server/program-pdf";
import { programHistory } from "../../src/modules/campaigns/server/program-history";
import {
  fixtureCampaign as campaign,
  fixtureRegistration as reg,
} from "../campaign-program/fixture";
import {
  POST as participantPOST,
  GET as participantGET,
} from "../../src/app/api/campanas/participant/change-requests/route";
import { POST as resolvePOST } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/resolve/route";
import { GET as adminGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/route";
import { seedChangesFixture } from "./fixture";
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
const assignment = (id: string) => db.collection("campaignAssignments").doc(id);
const requestDoc = (id: string) => db.collection("changeRequests").doc(id);
const sourceVersion = async (version = 1) =>
  (
    await db
      .collection("campaignProgramVersions")
      .doc(`${campaign}__v${version}`)
      .get()
  ).data();
const allAssignments = async () =>
  (await db.collection("campaignAssignments").get()).docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
async function create(index = 3) {
  const turn = (await getPersonalProgram(cookies[index])).campaigns[0].turns[0];
  return createChangeRequest(cookies[index], {
    turnId: turn.turnId,
    reasonCode: "cannot_attend",
    comment: "Motivo operacional ficticio",
  });
}
async function approved(index = 3) {
  const request = await create(index);
  await decideChange(token, campaign, request.id, "approve", {});
  return request.id;
}
async function resolutionInput(id: string, replacement = 7) {
  const detail = await adminChanges(token, campaign, id);
  return {
    expectedProgramVersion: detail.expectedProgramVersion,
    currentProgramVersionId: detail.currentProgramVersionId,
    expectedRevision: detail.expectedRevision,
    replacementRegistrationId: reg(replacement),
    confirmWarnings: true,
    confirmUnit: true,
  };
}
const context = (id = "missing") => ({
  params: Promise.resolve({ campaignId: campaign, id }),
});
const adminRequest = (
  credential = token,
  body?: unknown,
  origin = "http://localhost",
) =>
  new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/change-requests`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${credential}`,
        Origin: origin,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
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
  ({ token, secondToken, ordinaryToken, cookies } = await seedChangesFixture());
});
after(async () => {
  await env.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
test("Propietario crea pending con versión oficial y auditoría mínima", async () => {
  const r = await create();
  const data = (await requestDoc(r.id).get()).data()!;
  assert.equal(data.status, "pending");
  assert.equal(data.sourceProgramVersion, 1);
  assert.equal(data.participantId, "person-3");
  assert.equal(
    (await assignment("ordinary-a").get()).data()?.status,
    "published",
  );
  const audit = (
    await db
      .collection("auditLogs")
      .where("action", "==", "change_request_created")
      .get()
  ).docs[0].data();
  assert.equal(audit.actorId, "person-3");
  assert.doesNotMatch(
    JSON.stringify(audit),
    /Motivo operacional|phone|pinHash/,
  );
});
test("Turno de otro participante no permite solicitud", async () => {
  const own = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
  await assert.rejects(
    createChangeRequest(cookies[4], {
      turnId: own.turnId,
      reasonCode: "other",
    }),
    denied(404),
  );
});
for (const extra of [
  "participantId",
  "registrationId",
  "status",
  "assignmentId",
  "snapshot",
])
  test(`Zod strict rechaza inyección ${extra}`, async () => {
    const own = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
    await assert.rejects(
      createChangeRequest(cookies[3], {
        turnId: own.turnId,
        reasonCode: "other",
        [extra]: "injected",
      }),
      denied(400),
    );
  });
test("Comentario >500 y motivo desconocido rechazados", async () => {
  const own = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
  for (const data of [
    { comment: "x".repeat(501), reasonCode: "other" },
    { reasonCode: "medical" },
  ])
    await assert.rejects(
      createChangeRequest(cookies[3], { turnId: own.turnId, ...data }),
      denied(400),
    );
});
for (const status of ["draft", "cancelled"])
  test(`Assignment ${status} no permite crear solicitud`, async () => {
    await assignment("ordinary-a").update({ status });
    await assert.rejects(create(), denied(404));
  });
for (const status of ["draft", "planning", "registration_open"])
  test(`Campaign ${status} rechazada`, async () => {
    await db.collection("campaigns").doc(campaign).update({ status });
    const version = await sourceVersion();
    await assert.rejects(
      createChangeRequest(cookies[3], {
        turnId: turnId(version as any, "ordinary-a"),
        reasonCode: "other",
      }),
      denied(409),
    );
  });
test("TurnId manipulado rechazado", async () => {
  await assert.rejects(
    createChangeRequest(cookies[3], {
      turnId: "fake.forged",
      reasonCode: "other",
    }),
    denied(400),
  );
});
for (const state of ["pending", "approved"])
  test(`Duplicado ${state} bloqueado`, async () => {
    const r = await create();
    if (state === "approved")
      await decideChange(token, campaign, r.id, "approve", {});
    const turn = (await getPersonalProgram(cookies[3], false, true))
      .campaigns[0].turns[0];
    assert.equal(turn.canRequestChange, false);
    assert.equal(turn.changeRequestStatus, state);
    await assert.rejects(create(), denied(409));
  });
test("Dos creaciones concurrentes dejan una sola pending", async () => {
  const result = await Promise.allSettled([create(), create()]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await db.collection("changeRequests").get()).size, 1);
});
test("Aprobar NO autoasigna ni modifica Assignment, versión, Campaign o Mi programa", async () => {
  const r = await create(),
    assignments = await allAssignments(),
    version = await sourceVersion(),
    program = await getPersonalProgram(cookies[3]),
    campaignBefore = (
      await db.collection("campaigns").doc(campaign).get()
    ).data();
  await decideChange(token, campaign, r.id, "approve", {});
  assert.deepEqual(await allAssignments(), assignments);
  assert.deepEqual(await sourceVersion(), version);
  assert.deepEqual(await getPersonalProgram(cookies[3]), program);
  assert.deepEqual(
    (await db.collection("campaigns").doc(campaign).get()).data(),
    campaignBefore,
  );
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 1);
  const request = (await requestDoc(r.id).get()).data()!;
  assert.equal(request.status, "approved");
  assert.equal(request.resolvedBy, undefined);
  assert.equal(
    (await participantNotifications(cookies[3])).filter(
      (n) => n.type === "change_request_approved",
    ).length,
    1,
  );
});
test("Rechazar es terminal, no modifica programa y responde al participante", async () => {
  const r = await create(),
    before = await sourceVersion();
  await decideChange(token, campaign, r.id, "reject", {
    organizerResponse: "Respuesta breve",
  });
  const request = (await requestDoc(r.id).get()).data()!;
  assert.equal(request.status, "rejected");
  assert.equal(request.resolvedBy, "dashboard-organizer");
  assert.ok(request.resolvedAt);
  await assert.rejects(
    decideChange(token, campaign, r.id, "approve", {}),
    denied(409),
  );
  assert.deepEqual(await sourceVersion(), before);
  assert.equal(
    (await participantChanges(cookies[3]))[0].organizerResponse,
    "Respuesta breve",
  );
  assert.equal(
    (await participantNotifications(cookies[3]))[0].type,
    "change_request_rejected",
  );
});
test("pending no se resuelve sin aprobación", async () => {
  const r = await create();
  await assert.rejects(
    resolveChange(token, campaign, r.id, await resolutionInput(r.id)),
    denied(409),
  );
});
test("Reemplazo manual conserva slot, trazabilidad, v1 y programa actual v2", async () => {
  const id = await approved(),
    v1 = await sourceVersion(),
    oldPublishedAt = (
      await db.collection("campaigns").doc(campaign).get()
    ).data()!.publishedAt;
  const input = await resolutionInput(id);
  const result = await resolveChange(token, campaign, id, input);
  assert.equal(result.version, 2);
  assert.deepEqual(await sourceVersion(), v1);
  assert.equal(
    (await assignment("ordinary-a").get()).data()?.status,
    "cancelled",
  );
  const added = (
    await db
      .collection("campaignAssignments")
      .where("sourceChangeRequestId", "==", id)
      .get()
  ).docs
    .find((d) => d.data().status === "published")!
    .data();
  assert.equal(added.registrationId, reg(7));
  assert.equal(added.pointId, "point-1");
  assert.equal(added.timeBlockId, "block-0");
  assert.equal(added.slotNumber, 1);
  assert.equal(added.createdBy, "dashboard-organizer");
  assert.equal(added.publishedInVersion, 2);
  const c = (await db.collection("campaigns").doc(campaign).get()).data()!;
  assert.equal(c.status, "published");
  assert.equal(c.currentProgramVersionId, `${campaign}__v2`);
  assert.equal(c.programVersion, 2);
  assert.deepEqual(c.publishedAt, oldPublishedAt);
  assert.ok(c.updatedProgramAt);
  assert.equal((await requestDoc(id).get()).data()?.status, "resolved");
  assert.equal(
    (await getPersonalProgram(cookies[3])).campaigns[0].turns.length,
    0,
  );
  assert.equal((await getPersonalProgram(cookies[7])).campaigns[0].version, 2);
  assert.equal(
    (await getPersonalProgram(cookies[7])).campaigns[0].turns.length,
    1,
  );
  await assert.rejects(resolveChange(token, campaign, id, input), denied(409));
});
test("Sin reemplazo requiere confirmación; nuevo slot Pendiente y warning", async () => {
  const id = await approved();
  const { replacementRegistrationId, ...base } = await resolutionInput(id);
  await assert.rejects(resolveChange(token, campaign, id, base), denied(422));
  const preview = await previewResolution(token, campaign, id, {
    ...base,
    releaseWithoutReplacement: true,
  });
  assert.ok(preview.view.warnings.some((i) => i.code === "incomplete_point"));
  await assert.rejects(
    resolveChange(token, campaign, id, {
      ...base,
      releaseWithoutReplacement: true,
      confirmWarnings: false,
    }),
    denied(422),
  );
  const result = await resolveChange(token, campaign, id, {
    ...base,
    releaseWithoutReplacement: true,
  });
  assert.equal(result.snapshot.days[0].blocks[0].cells[1].slots[0], null);
});
test("Reservas activas disponibles sin assignment, orden alfabético, sin ranking", async () => {
  const id = await approved();
  const detail = await adminChanges(token, campaign, id);
  const list = detail.requests[0].reserves;
  assert.ok(list.some((r) => r.registrationId === reg(7)));
  assert.ok(!list.some((r) => r.registrationId === reg(3)));
  assert.ok(!list.some((r) => r.registrationId === reg(70)));
  assert.deepEqual(
    list.map((r) => r.fullName),
    list.map((r) => r.fullName).sort((a, b) => a.localeCompare(b, "es")),
  );
  assert.doesNotMatch(JSON.stringify(list), /score|ranking|phone|pinHash/);
  await resolveChange(token, campaign, id, await resolutionInput(id));
  const second = await approved(4);
  assert.ok(
    !(await adminChanges(token, campaign, second)).requests[0].reserves.some(
      (r) => r.registrationId === reg(7),
    ),
  );
});
for (const kind of [
  "inactive-profile",
  "withdrawn-registration",
  "unavailable",
])
  test(`Reserva ${kind} no asignable`, async () => {
    const id = await approved();
    if (kind === "inactive-profile")
      await db
        .collection("participants")
        .doc("person-7")
        .update({ active: false });
    if (kind === "withdrawn-registration")
      await db
        .collection("campaignRegistrations")
        .doc(reg(7))
        .update({ registrationStatus: "withdrawn" });
    if (kind === "unavailable")
      await db
        .collection("availabilities")
        .doc("availability-7-0")
        .update({ available: false });
    await assert.rejects(
      resolveChange(token, campaign, id, await resolutionInput(id)),
      denied(422),
    );
  });
test("Máximo exige override, se audita y no modifica maxTurns", async () => {
  ({ token, secondToken, ordinaryToken, cookies } = await seedChangesFixture(
    async (fixtureDb) => {
      await fixtureDb
        .collection("campaignRegistrations")
        .doc(reg(7))
        .update({ maxTurns: 1 });
      await assignment("reserve-existing").set({
        ...(await assignment("ordinary-a").get()).data(),
        id: "reserve-existing",
        registrationId: reg(7),
        timeBlockId: "block-1",
        pointId: "point-0",
        slotNumber: 1,
        status: "draft",
      });
    },
  ));
  const id = await approved();
  const input = await resolutionInput(id);
  await assert.rejects(resolveChange(token, campaign, id, input), denied(422));
  await resolveChange(token, campaign, id, {
    ...input,
    maxTurnsOverrides: [reg(7)],
  });
  assert.equal(
    (await db.collection("campaignRegistrations").doc(reg(7)).get()).data()
      ?.maxTurns,
    1,
  );
  const audit = (
    await db
      .collection("auditLogs")
      .where("action", "==", "post_publish_assignment_created")
      .get()
  ).docs[0].data();
  assert.equal(audit.metadata.maxTurnsOverride, true);
});
test("Saliente accepted no se retira individualmente; liberar ambos conserva accepted", async () => {
  const id = await approved(0),
    { replacementRegistrationId, ...base } = await resolutionInput(id);
  await assert.rejects(
    resolveChange(token, campaign, id, {
      ...base,
      releaseWithoutReplacement: true,
      confirmUnit: false,
    }),
    denied(422),
  );
  await resolveChange(token, campaign, id, {
    ...base,
    releaseWithoutReplacement: true,
  });
  assert.equal(
    (await assignment("accepted-a").get()).data()?.status,
    "cancelled",
  );
  assert.equal(
    (await assignment("accepted-b").get()).data()?.status,
    "cancelled",
  );
  assert.equal(
    (await db.collection("pairRequests").doc("accepted-normal").get()).data()
      ?.status,
    "accepted",
  );
});
async function reservePair() {
  await db
    .collection("pairRequests")
    .doc("reserve-unit")
    .set({
      id: "reserve-unit",
      campaignId: campaign,
      requesterRegistrationId: reg(7),
      recipientRegistrationId: reg(8),
      status: "accepted",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
}
test("Reserva accepted no cabe en un solo slot y no rompe vínculo", async () => {
  await reservePair();
  const id = await approved();
  await assert.rejects(
    resolveChange(token, campaign, id, await resolutionInput(id)),
    denied(422),
  );
  assert.equal(await sourceVersion(2), undefined);
});
test("Reemplazo de unidad accepted admite reserva accepted en dos slots", async () => {
  await reservePair();
  const id = await approved(0);
  await resolveChange(token, campaign, id, await resolutionInput(id));
  const view = await getProgram(token, campaign);
  const slots = view.snapshot.days[0].blocks[0].cells[0].slots;
  assert.deepEqual(
    slots.map((s) => s?.registrationId),
    [reg(7), reg(8)],
  );
  assert.equal(
    (await db.collection("pairRequests").doc("accepted-normal").get()).data()
      ?.status,
    "accepted",
  );
});
test("V1→v2→v3 conserva snapshots/PDF históricos y consulta última versión", async () => {
  const v1 = await getProgram(token, campaign),
    pdf1 = await renderProgramPdf(v1);
  const first = await approved();
  await resolveChange(token, campaign, first, await resolutionInput(first));
  const v2 = await getProgram(token, campaign),
    pdf2 = await renderProgramPdf(v2);
  const second = await approved(7);
  await resolveChange(
    token,
    campaign,
    second,
    await resolutionInput(second, 9),
  );
  assert.equal((await getProgram(token, campaign)).version, 3);
  assert.deepEqual(
    await renderProgramPdf(await getProgram(token, campaign, 1)),
    pdf1,
  );
  assert.deepEqual(
    await renderProgramPdf(await getProgram(token, campaign, 2)),
    pdf2,
  );
  assert.notDeepEqual(pdf1, pdf2);
  assert.match(programPdfFilename(v2), /-v2\.pdf$/);
  assert.match(
    programPdfFilename(await getProgram(token, campaign)),
    /-v3\.pdf$/,
  );
  const previousAssignmentId =
    v2.snapshot.days[0].blocks[0].cells[1].slots[0]!.assignmentId;
  const previousAssignment = (
    await assignment(previousAssignmentId).get()
  ).data()!;
  assert.equal(previousAssignment.sourceChangeRequestId, first);
  assert.equal(previousAssignment.cancellationChangeRequestId, second);
  assert.equal((await getPersonalProgram(cookies[9])).campaigns[0].version, 3);
  assert.deepEqual(
    (await programHistory(token, campaign)).versions.map((v) => v.version),
    [1, 2, 3],
  );
});
test("Solicitud histórica nueva no aceptada aunque Assignment siga actual", async () => {
  const oldTurn = (await getPersonalProgram(cookies[4])).campaigns[0].turns[0];
  const id = await approved();
  await resolveChange(token, campaign, id, await resolutionInput(id));
  await assert.rejects(
    createChangeRequest(cookies[4], {
      turnId: oldTurn.turnId,
      reasonCode: "other",
    }),
    denied(409),
  );
});
test("Stale no se aplica automáticamente; requiere revisión manual explícita", async () => {
  const first = await approved(),
    second = await approved(4);
  await resolveChange(token, campaign, first, await resolutionInput(first));
  const detail = await adminChanges(token, campaign, second);
  assert.equal(detail.requests[0].stale, true);
  const input = await resolutionInput(second, 8);
  await assert.rejects(
    resolveChange(token, campaign, second, input),
    denied(409),
  );
  await resolveChange(token, campaign, second, {
    ...input,
    confirmStale: true,
  });
  assert.equal((await getProgram(token, campaign)).version, 3);
});
test("Cambio no incorpora silenciosamente nombres/horarios vivos de otras celdas", async () => {
  const id = await approved(),
    original = await getProgram(token, campaign);
  await db
    .collection("participants")
    .doc("person-4")
    .update({ fullName: "Nombre vivo distinto" });
  await db
    .collection("timeBlocks")
    .doc("block-0")
    .update({ startTime: "07:00" });
  await resolveChange(token, campaign, id, await resolutionInput(id));
  const next = await getProgram(token, campaign);
  assert.equal(
    next.snapshot.days[0].blocks[0].startTime,
    original.snapshot.days[0].blocks[0].startTime,
  );
  assert.equal(
    next.snapshot.days[0].blocks[0].cells[1].slots[1]?.fullName,
    original.snapshot.days[0].blocks[0].cells[1].slots[1]?.fullName,
  );
});
test("Mismo ChangeRequest concurrente: un ganador, una v2, avisos no duplicados", async () => {
  const id = await approved(),
    input = await resolutionInput(id);
  const result = await Promise.allSettled([
    resolveChange(token, campaign, id, input),
    resolveChange(secondToken, campaign, id, input),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 2);
  const notices = await participantNotifications(cookies[3]);
  assert.equal(
    notices.some((n) => n.type === "change_request_approved"),
    false,
  );
  assert.equal(
    (
      await db
        .collection("campaignNotifications")
        .where("type", "==", "change_request_approved")
        .get()
    ).size,
    1,
  );
  assert.equal(
    notices.filter((n) => n.type === "change_request_resolved").length,
    1,
  );
  assert.equal(
    notices.filter((n) => n.type === "assignment_changed").length,
    1,
  );
});
test("Dos solicitudes desde v1: solo una publica v2; la otra recibe 409", async () => {
  const a = await approved(),
    b = await approved(4),
    inputA = await resolutionInput(a),
    inputB = await resolutionInput(b, 8);
  const result = await Promise.allSettled([
    resolveChange(token, campaign, a, inputA),
    resolveChange(secondToken, campaign, b, inputB),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const failure = result.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.ok(denied(409)(failure.reason));
  assert.equal((await db.collection("campaignProgramVersions").get()).size, 2);
});
test("Históricos duplicados sobre mismo turno nunca producen dos reemplazos", async () => {
  const a = await approved(),
    stored = (await requestDoc(a).get()).data()!;
  await requestDoc("legacy-duplicate").set({
    ...stored,
    id: "legacy-duplicate",
  });
  const ia = await resolutionInput(a),
    ib = await resolutionInput("legacy-duplicate", 8);
  const result = await Promise.allSettled([
    resolveChange(token, campaign, a, ia),
    resolveChange(secondToken, campaign, "legacy-duplicate", ib),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(
    resolveChange(token, campaign, "legacy-duplicate", {
      ...(await resolutionInput("legacy-duplicate", 8)),
      confirmStale: true,
    }),
    denied(409),
  );
});
test("Notifica retirado, entrante y compañero, no ajenos; sin datos sensibles", async () => {
  const id = await approved();
  await resolveChange(token, campaign, id, await resolutionInput(id));
  for (const index of [3, 7, 4])
    assert.equal(
      (await participantNotifications(cookies[index])).filter(
        (n) => n.type === "assignment_changed",
      ).length,
      1,
    );
  assert.equal((await participantNotifications(cookies[0])).length, 0);
  const rows = (await db.collection("campaignNotifications").get()).docs.map(
    (d) => d.data(),
  );
  assert.doesNotMatch(
    JSON.stringify(rows),
    /pinHash|phone|DeviceSession|Motivo operacional/,
  );
});
test("Aprobación repetida/concurrente no duplica avisos", async () => {
  const r = await create();
  const results = await Promise.allSettled([
    decideChange(token, campaign, r.id, "approve", {}),
    decideChange(secondToken, campaign, r.id, "approve", {}),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await participantNotifications(cookies[3])).length, 1);
});
test("Auditoría de resolución tiene actor UID/version y sin comentario completo", async () => {
  const id = await approved();
  await resolveChange(secondToken, campaign, id, await resolutionInput(id));
  for (const action of [
    "change_request_resolved",
    "post_publish_assignment_cancelled",
    "post_publish_assignment_created",
    "program_version_created",
  ]) {
    const docs = (
      await db.collection("auditLogs").where("action", "==", action).get()
    ).docs;
    assert.equal(docs.length, 1);
    assert.equal(docs[0].data().actorId, "planner-organizer-2");
    assert.equal(docs[0].data().version, 2);
    assert.doesNotMatch(
      JSON.stringify(docs[0].data()),
      /Motivo operacional|pinHash|phone/,
    );
  }
});
test("Solo solicitudes propias en DTO; no UID organizador ni secretos", async () => {
  const a = await create(),
    b = await create(4);
  await decideChange(token, campaign, a.id, "reject", {});
  const rows = await participantChanges(cookies[3]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, a.id);
  assert.notEqual(rows[0].id, b.id);
  assert.doesNotMatch(
    JSON.stringify(rows),
    /resolvedBy|participantId|registrationId|dashboard-organizer|pinHash|phone/,
  );
});
for (const field of ["comment", "organizerResponse"])
  test(`Respuesta ${field} de 501 rechazada`, async () => {
    const id = await approved();
    await assert.rejects(
      field === "comment"
        ? createChangeRequest(cookies[3], {
            turnId: "none",
            reasonCode: "other",
            comment: "x".repeat(501),
          })
        : decideChange(token, campaign, id, "reject", {
            organizerResponse: "x".repeat(501),
          }),
      denied(400),
    );
  });
for (const mutation of ["inactive", "expired", "revoked"])
  test(`Sesión ${mutation} no autoriza solicitud`, async () => {
    if (mutation === "inactive")
      await db
        .collection("participants")
        .doc("person-3")
        .update({ active: false });
    else
      await db
        .collection("deviceSessions")
        .doc(tokenHash(cookies[3]))
        .update(
          mutation === "expired"
            ? { expiresAt: Timestamp.fromMillis(1) }
            : { revokedAt: Timestamp.now() },
        );
    await assert.rejects(create(), denied(401));
  });
test("Admin sin token 401, sin claim 403 y cookie participante no autoriza", async () => {
  assert.equal((await adminGET(adminRequest(""), context())).status, 401);
  assert.equal(
    (await adminGET(adminRequest(ordinaryToken), context())).status,
    403,
  );
  const req = new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/change-requests`,
    { headers: { Cookie: `campaign_participant_session=${cookies[3]}` } },
  );
  assert.equal((await adminGET(req, context())).status, 401);
});
test("Claim retirado y cuenta deshabilitada rechazados", async () => {
  const auth = getAuth(campaignsAdminApp());
  await auth.setCustomUserClaims("dashboard-organizer", {});
  await assert.rejects(adminChanges(token, campaign), denied(403));
  await auth.setCustomUserClaims("dashboard-organizer", {
    campaign_admin: true,
  });
  await auth.updateUser("dashboard-organizer", { disabled: true });
  await assert.rejects(adminChanges(token, campaign), denied(401));
});
test("CSRF admin/participante rechazado y Cache-Control private no-store", async () => {
  const id = await approved();
  assert.equal(
    (
      await resolvePOST(
        adminRequest(token, await resolutionInput(id), "https://other.example"),
        context(id),
      )
    ).status,
    403,
  );
  const turn = (await getPersonalProgram(cookies[4])).campaigns[0].turns[0];
  const req = new NextRequest(
    "http://localhost/api/campanas/participant/change-requests",
    {
      method: "POST",
      headers: {
        Cookie: `campaign_participant_session=${cookies[4]}`,
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ turnId: turn.turnId, reasonCode: "other" }),
    },
  );
  assert.equal((await participantPOST(req)).status, 403);
  const response = await participantGET(
    new NextRequest(
      "http://localhost/api/campanas/participant/change-requests",
      { headers: { Cookie: `campaign_participant_session=${cookies[4]}` } },
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
for (const name of [
  "changeRequests",
  "campaignNotifications",
  "campaignChangeRequestLocks",
  "campaignProgramVersions",
  "campaignAssignments",
  "campaignPlannerLocks",
])
  test(`Rules deniegan cliente ${name}, incluido campaign_admin`, async () => {
    for (const context of [
      env.unauthenticatedContext(),
      env.authenticatedContext("client-admin", { campaign_admin: true }),
    ]) {
      const ref = doc(context.firestore(), name, "any");
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, { injected: true }));
    }
  });
test("Locator opaco no revela IDs al decodificar base64", async () => {
  const turn = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
  assert.doesNotMatch(
    Buffer.from(turn.turnId!, "base64url").toString("utf8"),
    /dashboard-80|ordinary-a|__v1|reg-03/,
  );
  assert.equal(
    (await getPersonalProgram(cookies[3])).campaigns[0].turns[0].turnId,
    turn.turnId,
  );
});
test("Revisión obsoleta por perfil vivo rechaza sin escritura parcial", async () => {
  const id = await approved(),
    input = await resolutionInput(id),
    original = await sourceVersion();
  await db
    .collection("participants")
    .doc("person-7")
    .update({ fullName: "Nombre actualizado" });
  await assert.rejects(resolveChange(token, campaign, id, input), denied(409));
  assert.deepEqual(await sourceVersion(), original);
  assert.equal(await sourceVersion(2), undefined);
});
test("Pointer/versión esperada falsificados rechazan con 409", async () => {
  const id = await approved(),
    input = await resolutionInput(id);
  await assert.rejects(
    resolveChange(token, campaign, id, { ...input, expectedProgramVersion: 2 }),
    denied(409),
  );
  await assert.rejects(
    resolveChange(token, campaign, id, {
      ...input,
      currentProgramVersionId: "wrong-version",
    }),
    denied(409),
  );
});
test("Reserva accepted exige confirmación de unidad y disponibilidad de ambos", async () => {
  await reservePair();
  const id = await approved(0);
  await assert.rejects(
    resolveChange(token, campaign, id, {
      ...(await resolutionInput(id)),
      confirmUnit: false,
    }),
    denied(422),
  );
  await db
    .collection("availabilities")
    .doc("availability-8-0")
    .update({ available: false });
  await assert.rejects(
    resolveChange(token, campaign, id, await resolutionInput(id)),
    denied(422),
  );
  assert.equal(await sourceVersion(2), undefined);
});
test("Blocker de referencia inactiva impide v2", async () => {
  const id = await approved();
  await db.collection("points").doc("point-1").update({ active: false });
  await assert.rejects(
    resolveChange(token, campaign, id, await resolutionInput(id)),
    denied(422),
  );
  assert.equal(await sourceVersion(2), undefined);
});
test("Liberar última asignación permite programa vacío con warnings confirmados", async () => {
  ({ token, secondToken, ordinaryToken, cookies } = await seedChangesFixture(
    async (fixtureDb) => {
      const rows = await fixtureDb.collection("campaignAssignments").get(),
        batch = fixtureDb.batch();
      rows.docs
        .filter((d) => d.id !== "ordinary-a")
        .forEach((d) => batch.update(d.ref, { status: "cancelled" }));
      await batch.commit();
    },
  ));
  const id = await approved(),
    { replacementRegistrationId, ...input } = await resolutionInput(id);
  const result = await resolveChange(token, campaign, id, {
    ...input,
    releaseWithoutReplacement: true,
  });
  assert.equal(result.assignmentCount, 0);
  assert.ok(result.warnings.some((i) => i.code === "empty_point"));
  assert.equal(result.version, 2);
});
test("Detalles ajenos a campaña e historia inexistente no filtran datos", async () => {
  await assert.rejects(adminChanges(token, campaign, "missing"), denied(404));
  await assert.rejects(getProgram(token, campaign, 0), denied(400));
});
test("Override de participante no entrante se rechaza", async () => {
  const id = await approved();
  await assert.rejects(
    resolveChange(token, campaign, id, {
      ...(await resolutionInput(id)),
      maxTurnsOverrides: [reg(0)],
    }),
    denied(400),
  );
});
test("Rate limit individual 10/15 minutos; no cambia límites globales auth", async () => {
  const turn = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
  await create();
  for (let i = 1; i < 10; i++) await assert.rejects(create(), denied(409));
  await assert.rejects(
    createChangeRequest(cookies[3], {
      turnId: turn.turnId,
      reasonCode: "other",
    }),
    denied(429),
  );
  assert.equal(
    (await db.collection("campaignAuthLimits").get()).docs.some(
      (d) => d.data().count === 11,
    ),
    false,
  );
});
