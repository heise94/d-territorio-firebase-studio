import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, beforeEach, after, test } from "node:test";
import { getApps, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  type Transaction,
} from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { NextRequest } from "next/server";
import {
  campaignsAdminDb,
  campaignsAdminApp,
} from "../../src/modules/campaigns/server/firebase-admin";
import {
  getPlanner,
  setBlockPoint,
  createAssignment,
  changeAssignment,
  changePlannerStatus,
  PlannerWarnings,
} from "../../src/modules/campaigns/server/planner-service";
import {
  readPlannerSource,
  blockPointId,
} from "../../src/modules/campaigns/server/planner-source";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import { canTransitionCampaignStatus } from "../../src/modules/campaigns/domain/campaign-status";
import { plannerConflictMessage } from "../../src/modules/campaigns/domain/planner";
import { GET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/planner/route";
import { POST as assignPOST } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/assignments/route";
import { POST as pointPOST } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/block-points/route";
import { POST as statusPOST } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/status/route";
import { PATCH } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/assignments/[assignmentId]/route";
import {
  seedPlannerFixture,
  fixtureCampaign as campaign,
  fixtureRegistration as reg,
  fixtureToken,
} from "./fixture";
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
  "Both local emulators required",
);
const db = campaignsAdminDb();
let env: RulesTestEnvironment,
  token: string,
  secondToken: string,
  ordinaryToken: string;
const denied = (status: number) => (error: unknown) =>
  error instanceof AuthError && error.status === status;
const input = (
  index = 3,
  point = "point-0",
  slot = 1,
  block = "block-0",
  overrides: unknown[] = [],
) => ({
  registrationId: reg(index),
  pointId: point,
  slotNumber: slot,
  timeBlockId: block,
  overrides,
});
const assignments = async (): Promise<any[]> =>
  (
    await db
      .collection("campaignAssignments")
      .where("campaignId", "==", campaign)
      .get()
  ).docs.map((item) => ({ ...item.data(), id: item.id }));
const current = async () =>
  (await assignments()).filter((item: any) => item.status === "draft") as any[];
const context = () => ({ params: Promise.resolve({ campaignId: campaign }) });
const request = (
  suffix: string,
  method = "GET",
  body?: unknown,
  credential: string | undefined = token,
) =>
  new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/${suffix}`,
    {
      method,
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
        Cookie: "campaign_participant_session=not-an-admin",
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
  await env.clearFirestore();
});
beforeEach(async () => {
  ({ token, secondToken, ordinaryToken } = await seedPlannerFixture());
});
after(async () => {
  await env?.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
test("Fixture 80, cuatro congregaciones y 3/5/8 puntos por bloque", async () => {
  for (let b = 0; b < 3; b++) {
    const view = await getPlanner(token, campaign, `block-${b}`);
    assert.equal(view.metrics.activePoints, [3, 5, 8][b]);
    assert.equal(view.metrics.openSlots, [6, 10, 16][b]);
    assert.equal(view.block!.capacity, 16);
    assert.equal(view.points.length, 8);
  }
  assert.equal(
    (
      await db
        .collection("campaignRegistrations")
        .where("campaignId", "==", campaign)
        .get()
    ).size,
    80,
  );
});
test("BlockPoint determinístico, activación idempotente auditada una vez", async () => {
  const data = { timeBlockId: "block-0", pointId: "point-3", active: true };
  const before = (await db.collection("auditLogs").get()).size;
  await Promise.all([
    setBlockPoint(token, campaign, data),
    setBlockPoint(secondToken, campaign, data),
  ]);
  const point = await db
    .collection("blockPoints")
    .doc(blockPointId(data.timeBlockId, data.pointId))
    .get();
  assert.equal(point.data()!.active, true);
  assert.ok(point.data()!.createdAt);
  assert.equal((await db.collection("auditLogs").get()).size - before, 1);
});
test("Desactivar punto vacío conserva relación e historial", async () => {
  await setBlockPoint(token, campaign, {
    timeBlockId: "block-0",
    pointId: "point-0",
    active: false,
  });
  assert.equal((await getPlanner(token, campaign)).metrics.activePoints, 2);
  assert.equal(
    (
      await db
        .collection("blockPoints")
        .doc(blockPointId("block-0", "point-0"))
        .get()
    ).data()!.active,
    false,
  );
});
test("Punto ocupado exige liberar antes y no cancela assignments", async () => {
  await createAssignment(token, campaign, input());
  await assert.rejects(
    setBlockPoint(token, campaign, {
      timeBlockId: "block-0",
      pointId: "point-0",
      active: false,
    }),
    denied(409),
  );
  assert.equal((await current()).length, 1);
});
test("Crear draft, UID real, timestamps y desaparición inmediata de disponibles", async () => {
  await createAssignment(token, campaign, input());
  const [item] = await current();
  assert.equal(item.createdBy, "dashboard-organizer");
  assert.equal(item.status, "draft");
  assert.ok(item.createdAt instanceof Timestamp);
  const view = await getPlanner(token, campaign);
  assert.ok(!view.available.some((person) => person.registrationId === reg(3)));
  assert.equal(view.metrics.assigned, 1);
});
test("Pareja manual no crea PairRequest ni vínculo permanente", async () => {
  const before = (await db.collection("pairRequests").get()).size;
  await createAssignment(token, campaign, input(3));
  await createAssignment(token, campaign, input(4, "point-0", 2));
  assert.equal((await current()).length, 2);
  assert.equal((await db.collection("pairRequests").get()).size, before);
});
test("Slot único y persona única dentro del bloque", async () => {
  await createAssignment(token, campaign, input());
  await assert.rejects(
    createAssignment(token, campaign, input(4)),
    denied(409),
  );
  await assert.rejects(
    createAssignment(token, campaign, input(3, "point-1")),
    denied(409),
  );
});
test("Liberar cancela con trazabilidad y vuelve a Disponible/reserva", async () => {
  const before = (await getPlanner(token, campaign)).metrics.reserve;
  await createAssignment(token, campaign, input());
  const [item] = await current();
  await changeAssignment(token, campaign, item.id, {
    action: "cancel",
    expectedVersion: 1,
  });
  assert.equal((await current()).length, 0);
  assert.equal((await assignments())[0].status, "cancelled");
  const view = await getPlanner(token, campaign);
  assert.ok(view.available.some((person) => person.registrationId === reg(3)));
  assert.equal(view.metrics.reserve, before);
});
test("Mover punto y slot preserva id/createdBy y no duplica", async () => {
  await createAssignment(token, campaign, input());
  const [item] = await current();
  await changeAssignment(secondToken, campaign, item.id, {
    action: "move",
    expectedVersion: 1,
    pointId: "point-1",
    slotNumber: 2,
  });
  const [moved] = await current();
  assert.equal(moved.id, item.id);
  assert.equal(moved.createdBy, "dashboard-organizer");
  assert.equal(moved.pointId, "point-1");
  assert.equal(moved.slotNumber, 2);
  assert.equal(moved.version, 2);
});
test("Movimiento a slot ocupado no modifica destino/origen", async () => {
  await createAssignment(token, campaign, input());
  await createAssignment(token, campaign, input(4, "point-1"));
  const item = (await current()).find((a) => a.registrationId === reg(3));
  await assert.rejects(
    changeAssignment(token, campaign, item.id, {
      action: "move",
      expectedVersion: 1,
      pointId: "point-1",
      slotNumber: 1,
    }),
    denied(409),
  );
  assert.equal(
    (await current()).find((a) => a.id === item.id).pointId,
    "point-0",
  );
});
test("Disponibilidad falsa o ausente exige confirmación, no cambia Availability", async () => {
  const avail = await db
    .collection("availabilities")
    .doc("false-selection")
    .get();
  await assert.rejects(
    createAssignment(token, campaign, input(70)),
    (e: any) =>
      e instanceof PlannerWarnings && e.warnings[0].kind === "availability",
  );
  await createAssignment(
    token,
    campaign,
    input(70, "point-0", 1, "block-0", [
      { registrationId: reg(70), availability: true },
    ]),
  );
  assert.equal((await current())[0].availabilityOverride, true);
  assert.deepEqual(
    (await db.collection("availabilities").doc("false-selection").get()).data(),
    avail.data(),
  );
});
test("available=false jamás se interpreta como disponible", async () => {
  await db
    .collection("availabilities")
    .doc("availability-30-0")
    .update({ available: false });
  await assert.rejects(
    createAssignment(token, campaign, input(30)),
    (e) => e instanceof PlannerWarnings,
  );
});
test("maxTurns por campaña: warning personal, confirmación y registro sin cambiar preferencia", async () => {
  await createAssignment(token, campaign, input(6));
  await assert.rejects(
    createAssignment(token, campaign, input(6, "point-0", 1, "block-1")),
    (e: any) =>
      e instanceof PlannerWarnings &&
      e.warnings[0].registrationId === reg(6) &&
      e.warnings[0].kind === "maxTurns",
  );
  await createAssignment(
    token,
    campaign,
    input(6, "point-0", 1, "block-1", [
      { registrationId: reg(6), maxTurns: true },
    ]),
  );
  assert.equal((await current()).filter((a) => a.maxTurnsOverride).length, 1);
  assert.equal(
    (await db.collection("campaignRegistrations").doc(reg(6)).get()).data()!
      .maxTurns,
    1,
  );
});
test("maxTurns null no limita; cancelados no cuentan", async () => {
  await db
    .collection("campaignRegistrations")
    .doc(reg(4))
    .update({ maxTurns: null });
  for (let b = 0; b < 3; b++)
    await createAssignment(
      token,
      campaign,
      input(4, "point-0", 1, `block-${b}`),
    );
  assert.equal(
    (await getPlanner(token, campaign)).points[0].slots[0]!.person
      .assignedTurns,
    3,
  );
  const item = (await current()).find((a) => a.timeBlockId === "block-0");
  await changeAssignment(token, campaign, item.id, {
    action: "cancel",
    expectedVersion: 1,
  });
  assert.equal(
    (await getPlanner(token, campaign)).available.find(
      (p) => p.registrationId === reg(4),
    )!.assignedTurns,
    2,
  );
});
test("Accepted asigna dos slots atómicos, mueve y libera juntos", async () => {
  await createAssignment(token, campaign, input(0));
  let items = await current();
  assert.equal(items.length, 2);
  assert.deepEqual(new Set(items.map((a) => a.slotNumber)), new Set([1, 2]));
  await changeAssignment(token, campaign, items[0].id, {
    action: "move",
    expectedVersion: 1,
    pointId: "point-1",
    slotNumber: 2,
  });
  items = await current();
  assert.ok(items.every((a) => a.pointId === "point-1"));
  await changeAssignment(token, campaign, items[0].id, {
    action: "cancel",
    expectedVersion: 2,
  });
  assert.equal((await current()).length, 0);
});
test("Accepted sin comunes visible, override de miembro ausente, sin cambiar Availability", async () => {
  const view = await getPlanner(token, campaign);
  assert.equal(
    view.available.find((p) => p.registrationId === reg(2))!.accepted!
      .availabilityConflict,
    true,
  );
  const before = (await db.collection("availabilities").get()).size;
  await assert.rejects(
    createAssignment(token, campaign, input(2)),
    (e: any) =>
      e instanceof PlannerWarnings &&
      e.warnings.some((w: any) => w.registrationId === reg(20)),
  );
  await createAssignment(
    token,
    campaign,
    input(2, "point-0", 1, "block-0", [
      { registrationId: reg(20), availability: true },
    ]),
  );
  assert.equal((await current()).length, 2);
  assert.equal((await db.collection("availabilities").get()).size, before);
});
test("Accepted: warning específico maxTurns de un miembro y ninguna escritura parcial", async () => {
  await db
    .collection("campaignRegistrations")
    .doc(reg(1))
    .update({ maxTurns: 1 });
  await createAssignment(token, campaign, input(0));
  await assert.rejects(
    createAssignment(token, campaign, input(0, "point-0", 1, "block-1")),
    (e: any) =>
      e instanceof PlannerWarnings &&
      e.warnings.length === 1 &&
      e.warnings[0].registrationId === reg(1),
  );
  assert.equal((await current()).length, 2);
  await createAssignment(
    token,
    campaign,
    input(0, "point-0", 1, "block-1", [
      { registrationId: reg(1), maxTurns: true },
    ]),
  );
  assert.equal((await current()).length, 4);
});
async function legacy() {
  await db
    .collection("campaignAssignments")
    .doc("legacy")
    .set({
      campaignId: campaign,
      timeBlockId: "block-0",
      pointId: "point-0",
      registrationId: reg(0),
      slotNumber: 1,
      status: "draft",
      createdBy: "dashboard-organizer",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
    });
}
test("Accepted legacy incompleto: conflicto, no separar/mover, completar mismo punto", async () => {
  await legacy();
  assert.ok(
    (await getPlanner(token, campaign)).conflicts.some((text) =>
      /incompleto/.test(text),
    ),
  );
  await assert.rejects(
    createAssignment(token, campaign, input(1, "point-1")),
    denied(409),
  );
  await assert.rejects(
    changeAssignment(token, campaign, "legacy", {
      action: "move",
      expectedVersion: 1,
      pointId: "point-1",
      slotNumber: 1,
    }),
    denied(409),
  );
  await createAssignment(token, campaign, input(1, "point-0", 2));
  assert.equal((await current()).length, 2);
  assert.ok((await current()).every((a) => a.pointId === "point-0"));
});
test("Accepted legacy se puede liberar sin dejar huérfano", async () => {
  await legacy();
  await changeAssignment(token, campaign, "legacy", {
    action: "cancel",
    expectedVersion: 1,
  });
  assert.equal((await current()).length, 0);
});
test("Accepted no puede entrar a punto parcialmente ocupado", async () => {
  await createAssignment(token, campaign, input(3));
  await assert.rejects(
    createAssignment(token, campaign, input(0, "point-0", 2)),
    denied(409),
  );
  assert.equal((await current()).length, 1);
});
test("Vínculos accepted corruptos no se adivinan", async () => {
  await db
    .collection("pairRequests")
    .doc("corrupt")
    .set({
      campaignId: campaign,
      requesterRegistrationId: reg(1),
      recipientRegistrationId: reg(3),
      status: "accepted",
    });
  await assert.rejects(
    createAssignment(token, campaign, input(0)),
    denied(409),
  );
  assert.equal((await current()).length, 0);
});
for (const [label, value, status] of [
  ["slot inválido", { ...input(), slotNumber: 3 }, 400],
  ["createdBy falsificado", { ...input(), createdBy: "forged" }, 400],
  ["bloque ajeno", input(3, "point-0", 1, "undefined-block"), 409],
  ["punto ajeno", input(3, "foreign-point"), 409],
  [
    "inscripción ajena",
    { ...input(), registrationId: "foreign-registration" },
    409,
  ],
  ["registro retirado", input(78), 409],
  ["perfil inactivo", input(77), 409],
  ["bloque inactivo", input(3, "point-0", 1, "block-5"), 409],
  ["día inactivo", input(3, "point-0", 1, "block-6"), 409],
  ["punto no activado", input(3, "point-7"), 409],
  [
    "override ajeno",
    input(3, "point-0", 1, "block-0", [
      { registrationId: reg(4), availability: true },
    ]),
    400,
  ],
] as const)
  test(`Rechazo servidor: ${label}`, async () => {
    await assert.rejects(
      createAssignment(token, campaign, value),
      denied(status),
    );
    assert.equal((await current()).length, 0);
  });
test("Punto global inactivo rechaza asignación/activación", async () => {
  await db.collection("points").doc("point-0").update({ active: false });
  await assert.rejects(createAssignment(token, campaign, input()), denied(409));
  await assert.rejects(
    setBlockPoint(token, campaign, {
      timeBlockId: "block-0",
      pointId: "point-0",
      active: true,
    }),
    denied(409),
  );
});
test("Capacidad 0 válida y límite de puntos configurado, no hardcodeado", async () => {
  await db
    .collection("timeBlocks")
    .doc("block-0")
    .update({ capacityOverride: 0 });
  assert.equal((await getPlanner(token, campaign)).block!.capacity, 0);
  await db
    .collection("campaignDays")
    .doc("day-0")
    .update({ maxPointsOverride: 3 });
  await assert.rejects(
    setBlockPoint(token, campaign, {
      timeBlockId: "block-0",
      pointId: "point-3",
      active: true,
    }),
    denied(409),
  );
});
async function race(first: Promise<unknown>, second: Promise<unknown>) {
  const result = await Promise.allSettled([first, second]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(
    result.some((r) => r.status === "rejected" && denied(409)(r.reason)),
  );
}
test("Dos UID: mismo slot solo un ganador", async () => {
  await race(
    createAssignment(token, campaign, input(3)),
    createAssignment(secondToken, campaign, input(4)),
  );
  assert.equal((await current()).length, 1);
});
test("Dos UID: misma persona en puntos distintos solo un ganador", async () => {
  await race(
    createAssignment(token, campaign, input(3)),
    createAssignment(secondToken, campaign, input(3, "point-1")),
  );
  assert.equal((await current()).length, 1);
});
test("Dos UID: accepted concurrente no duplica miembros", async () => {
  await race(
    createAssignment(token, campaign, input(0)),
    createAssignment(secondToken, campaign, input(1, "point-1")),
  );
  const items = await current();
  assert.equal(items.length, 2);
  assert.equal(new Set(items.map((a) => a.pointId)).size, 1);
});
test("Desactivar vs asignar: nunca assignment sobre relación inactiva", async () => {
  await race(
    setBlockPoint(token, campaign, {
      timeBlockId: "block-0",
      pointId: "point-0",
      active: false,
    }),
    createAssignment(secondToken, campaign, input()),
  );
  const bp = (
    await db
      .collection("blockPoints")
      .doc(blockPointId("block-0", "point-0"))
      .get()
  ).data()!;
  assert.ok(bp.active || (await current()).length === 0);
});
test("Liberar vs mover: versión evita pérdida silenciosa y duplicación", async () => {
  await createAssignment(token, campaign, input());
  const [item] = await current();
  await race(
    changeAssignment(token, campaign, item.id, {
      action: "cancel",
      expectedVersion: 1,
    }),
    changeAssignment(secondToken, campaign, item.id, {
      action: "move",
      expectedVersion: 1,
      pointId: "point-1",
      slotNumber: 2,
    }),
  );
  assert.ok((await current()).length <= 1);
  assert.equal((await assignments()).length, 1);
});
test("maxTurns concurrente entre bloques: segunda decisión exige override", async () => {
  const result = await Promise.allSettled([
    createAssignment(token, campaign, input(6)),
    createAssignment(secondToken, campaign, input(6, "point-0", 1, "block-1")),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(
    result.some(
      (r) => r.status === "rejected" && r.reason instanceof PlannerWarnings,
    ),
  );
  assert.equal((await current()).length, 1);
});
test("Auditoría mínima con UID, campaignId, entidad y timestamp", async () => {
  await createAssignment(
    secondToken,
    campaign,
    input(70, "point-0", 1, "block-0", [
      { registrationId: reg(70), availability: true },
    ]),
  );
  const audits = (
    await db.collection("auditLogs").where("campaignId", "==", campaign).get()
  ).docs.map((d) => d.data());
  assert.ok(
    audits.some(
      (a) =>
        a.action === "availability_override" &&
        a.actorId === "planner-organizer-2" &&
        a.entityId &&
        a.createdAt instanceof Timestamp,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(audits),
    /phoneNormalized|pinHash|fullName|overrideReason/,
  );
});
test("DTO mínimo sin teléfonos/hashes/sesiones", async () => {
  await createAssignment(token, campaign, input());
  const response = await GET(request("planner?blockId=block-0"), context());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control")!, /private, no-store/);
  assert.doesNotMatch(
    JSON.stringify(await response.json()),
    /phone|pinHash|SENSITIVE_SENTINEL|tokenHash|createdBy|DeviceSession/,
  );
});
test("Todas las lecturas y mutaciones rechazan cookie/token sin claim", async () => {
  for (const credential of ["", ordinaryToken]) {
    const expected = credential ? 403 : 401;
    assert.equal(
      (await GET(request("planner", "GET", undefined, credential), context()))
        .status,
      expected,
    );
    assert.equal(
      (
        await assignPOST(
          request("assignments", "POST", input(), credential),
          context(),
        )
      ).status,
      expected,
    );
    assert.equal(
      (
        await pointPOST(
          request("block-points", "POST", {}, credential),
          context(),
        )
      ).status,
      expected,
    );
    assert.equal(
      (await statusPOST(request("status", "POST", {}, credential), context()))
        .status,
      expected,
    );
    assert.equal(
      (
        await PATCH(request("assignments/none", "PATCH", {}, credential), {
          params: Promise.resolve({
            campaignId: campaign,
            assignmentId: "none",
          }),
        })
      ).status,
      expected,
    );
  }
});
test("HTTP 409 humanizado y 422 con advertencias individuales", async () => {
  await createAssignment(token, campaign, input());
  const response = await assignPOST(
    request("assignments", "POST", input(4)),
    context(),
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, plannerConflictMessage);
  const warning = await assignPOST(
    request("assignments", "POST", input(70, "point-1")),
    context(),
  );
  assert.equal(warning.status, 422);
  assert.equal((await warning.json()).warnings[0].registrationId, reg(70));
});
test("Claim actual retirado y cuenta deshabilitada niegan mutación", async () => {
  const auth = getAuth(campaignsAdminApp());
  try {
    await auth.setCustomUserClaims("dashboard-organizer", {});
    await assert.rejects(
      createAssignment(token, campaign, input()),
      denied(403),
    );
    await auth.setCustomUserClaims("dashboard-organizer", {
      campaign_admin: true,
    });
    await auth.updateUser("dashboard-organizer", { disabled: true });
    await assert.rejects(
      setBlockPoint(token, campaign, {
        timeBlockId: "block-0",
        pointId: "point-0",
        active: false,
      }),
      (e) => denied(401)(e) || denied(403)(e),
    );
  } finally {
    await auth.updateUser("dashboard-organizer", { disabled: false });
    await auth.setCustomUserClaims("dashboard-organizer", {
      campaign_admin: true,
    });
    token = await fixtureToken();
  }
});
test("Rules deny explícito de planner, incluso campaign_admin", async () => {
  for (const name of [
    "blockPoints",
    "campaignAssignments",
    "campaignPlannerLocks",
    "participants",
    "availabilities",
    "pairRequests",
    "auditLogs",
  ])
    for (const client of [
      env.unauthenticatedContext(),
      env.authenticatedContext("dashboard-organizer", { campaign_admin: true }),
    ]) {
      await assertFails(getDocs(collection(client.firestore(), name)));
      await assertFails(
        setDoc(doc(client.firestore(), name, "browser-forged"), {
          campaignId: campaign,
        }),
      );
    }
});
test("Solo draft→open→planning, sin retrocesos ni fases posteriores", async () => {
  assert.equal(canTransitionCampaignStatus("draft", "registration_open"), true);
  assert.equal(
    canTransitionCampaignStatus("registration_open", "planning"),
    true,
  );
  assert.equal(canTransitionCampaignStatus("planning", "published"), false);
  assert.equal(
    canTransitionCampaignStatus("planning", "registration_open"),
    false,
  );
  await db.collection("campaigns").doc(campaign).update({ status: "draft" });
  await assert.rejects(createAssignment(token, campaign, input()), denied(409));
  await changePlannerStatus(token, campaign, { status: "registration_open" });
  await changePlannerStatus(token, campaign, { status: "planning" });
  assert.equal((await getPlanner(token, campaign)).campaign.status, "planning");
  await assert.rejects(
    changePlannerStatus(token, campaign, { status: "published" }),
    denied(400),
  );
  await assert.rejects(
    changePlannerStatus(token, campaign, { status: "registration_open" }),
    denied(409),
  );
});
test("Lectura sin N+1 por participante: consultas fijas y field masks", async () => {
  let reads = 0,
    masks: string[][] = [];
  await db.runTransaction(
    async (tx) => {
      const counted = new Proxy(tx, {
        get(target, key) {
          if (key === "get")
            return (...args: any[]) => {
              reads++;
              return (target.get as any)(...args);
            };
          if (key === "getAll")
            return (...args: any[]) => {
              masks.push(args.at(-1).fieldMask);
              return (target.getAll as any)(...args);
            };
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }) as Transaction;
      await readPlannerSource(db, counted, campaign);
    },
    { readOnly: true },
  );
  assert.equal(reads, 11);
  assert.equal(masks.length, 2);
  assert.ok(
    masks.flat().every((field) => !/phone|hash|session|pin/i.test(field)),
  );
});
test("Assignment rechazada en open/published/active/completed y sin salto draft→planning", async () => {
  for (const status of [
    "registration_open",
    "published",
    "active",
    "completed",
  ]) {
    await db.collection("campaigns").doc(campaign).update({ status });
    await assert.rejects(
      createAssignment(token, campaign, input()),
      denied(409),
    );
    assert.equal((await getPlanner(token, campaign)).mutable, false);
  }
  await db.collection("campaigns").doc(campaign).update({ status: "draft" });
  await assert.rejects(
    changePlannerStatus(token, campaign, { status: "planning" }),
    denied(409),
  );
});
test("Audita max_turns_override específico y no acepta mover entre bloques por PATCH", async () => {
  await createAssignment(token, campaign, input(6));
  await createAssignment(
    secondToken,
    campaign,
    input(6, "point-0", 1, "block-1", [
      { registrationId: reg(6), maxTurns: true },
    ]),
  );
  const item = (await current()).find((a) => a.timeBlockId === "block-1");
  const logs = (
    await db.collection("auditLogs").where("campaignId", "==", campaign).get()
  ).docs.map((d) => d.data());
  assert.ok(
    logs.some(
      (log) =>
        log.action === "max_turns_override" &&
        log.entityId === item.id &&
        log.actorId === "planner-organizer-2",
    ),
  );
  await assert.rejects(
    changeAssignment(token, campaign, item.id, {
      action: "move",
      expectedVersion: 1,
      pointId: "point-1",
      slotNumber: 1,
      timeBlockId: "block-2",
    }),
    denied(400),
  );
});
test("Reserva/punto incompleto y dos documentos corruptos no cuentan doble turno", async () => {
  await createAssignment(token, campaign, input());
  const [item] = await current();
  await db
    .collection("campaignAssignments")
    .doc("corrupt-duplicate")
    .set({ ...item, id: "corrupt-duplicate", pointId: "point-1" });
  const view = await getPlanner(token, campaign);
  assert.equal(
    view.points.find((point) => point.id === "point-0")!.slots[0]!.person
      .assignedTurns,
    1,
  );
  assert.ok(view.conflicts.some((text) => /persona duplicada/.test(text)));
  assert.equal(view.metrics.incompletePoints, 2);
  assert.equal(view.metrics.reserve, view.available.length);
});
