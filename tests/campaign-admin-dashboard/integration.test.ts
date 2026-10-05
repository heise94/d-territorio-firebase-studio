import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, after, test } from "node:test";
import { getApps, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, getDocs } from "firebase/firestore";
import { NextRequest } from "next/server";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { CampaignAdminDashboardService } from "../../src/modules/campaigns/server/admin-dashboard-service";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import { orderedCoverageDays } from "../../src/modules/campaigns/domain/admin-dashboard";
import { GET as overviewGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/overview/route";
import { GET as participantsGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/route";
import { GET as detailGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/[registrationId]/route";
import {
  seedDashboardFixture,
  fixtureCampaign as campaign,
  fixturePhone,
  fixtureRegistration as reg,
  fixtureToken,
} from "./fixture";

process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
  "Both local emulators required",
);
let env: RulesTestEnvironment, token: string, ordinaryToken: string;
const db = campaignsAdminDb(),
  service = new CampaignAdminDashboardService(db);
const denied = (status: number) => (error: unknown) =>
  error instanceof AuthError && error.status === status;
const context = () => ({ params: Promise.resolve({ campaignId: campaign }) });
const request = (suffix: string, credential?: string, cookie?: string) =>
  new NextRequest(
    `http://localhost/api/campanas/admin/campaigns/${campaign}/${suffix}`,
    {
      headers: {
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    },
  );
function noSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(
    serialized,
    /pinHash|tokenHash|DeviceSession|deviceSessions|sessionToken|campaignAuthLimits|SENSITIVE_SENTINEL|createdBy|createdAt|updatedAt.*seconds/,
  );
}
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
  ({ token, ordinaryToken } = await seedDashboardFixture());
});
after(async () => {
  await env?.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
test("Sin token, token inválido y usuario Firebase sin claim: rechazo servidor", async () => {
  await assert.rejects(service.overview("", campaign), denied(401));
  await assert.rejects(
    service.overview("invalid-token", campaign),
    denied(401),
  );
  await assert.rejects(service.overview(ordinaryToken, campaign), denied(403));
});
test("Cada endpoint exige ID token; cookie del participante no autoriza", async () => {
  for (const credential of [undefined, ordinaryToken, token]) {
    const status = credential === token ? 200 : credential ? 403 : 401;
    assert.equal(
      (
        await overviewGET(
          request(
            "overview",
            credential,
            "campaign_participant_session=participant-cookie",
          ),
          context(),
        )
      ).status,
      status,
    );
    assert.equal(
      (await participantsGET(request("participants", credential), context()))
        .status,
      status,
    );
    assert.equal(
      (
        await detailGET(request(`participants/${reg(0)}`, credential), {
          params: Promise.resolve({
            campaignId: campaign,
            registrationId: reg(0),
          }),
        })
      ).status,
      status,
    );
  }
});
test("Respuestas privadas no-cache, Vary Authorization y DTOs permitidos", async () => {
  for (const response of [
    await overviewGET(request("overview", token), context()),
    await participantsGET(request("participants", token), context()),
    await detailGET(request(`participants/${reg(0)}`, token), {
      params: Promise.resolve({ campaignId: campaign, registrationId: reg(0) }),
    }),
  ]) {
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
    assert.equal(
      response.headers.get("vary"),
      "Authorization, X-Campaign-Search",
    );
    noSecrets(await response.json());
  }
});
test("Volumen 80/4 congregaciones: resumen y métricas sin duplicar vínculos", async () => {
  const view = await service.overview(token, campaign);
  assert.equal(view.congregations.length, 4);
  assert.deepEqual(view.metrics, {
    activeRegistrations: 78,
    needsSupportBlocks: 1,
    fullBlocks: 2,
    reservePotential: 11,
    pendingRequests: 1,
    acceptedLinks: 2,
    acceptedAvailabilityConflicts: 1,
  });
  assert.equal(view.campaign.status, "registration_open");
  assert.deepEqual(view.campaign.dates, ["2026-10-30", "2026-10-31"]);
  assert.ok(JSON.stringify(view).length < 8000);
});
test("Cobertura: fallback, override cero, full, reserva, near, medium y apoyo", async () => {
  const blocks = (await service.overview(token, campaign)).days.flatMap(
    (day) => day.blocks,
  );
  const support = blocks.find((block) => block.id === "block-0")!;
  assert.deepEqual(support.coverage, {
    availableCount: 6,
    capacity: 16,
    remainingCapacity: 10,
    reservePotential: 0,
    isFull: false,
    needsSupport: true,
  });
  assert.equal(support.state, "needs_support");
  assert.equal(
    blocks.find((block) => block.id === "block-1")!.coverage.reservePotential,
    3,
  );
  assert.equal(
    blocks.find((block) => block.id === "block-2")!.state,
    "near_full",
  );
  assert.equal(blocks.find((block) => block.id === "block-3")!.state, "medium");
  assert.equal(
    blocks.find((block) => block.id === "block-4")!.coverage.capacity,
    0,
  );
  assert.equal(
    blocks.find((block) => block.id === "block-4")!.coverage.availableCount,
    8,
  );
});
test("Capacidad por definir no inventa faltantes ni reserva", async () => {
  const block = (await service.overview(token, "undefined-capacity")).days[0]
    .blocks[0];
  assert.equal(block.state, "undefined");
  assert.equal(block.coverage.capacity, null);
  assert.equal(block.coverage.remainingCapacity, null);
  assert.equal(block.coverage.reservePotential, null);
});
test("Mayor déficit por defecto; opción cronológica sin alterar datos", async () => {
  const view = await service.overview(token, campaign);
  assert.equal(view.days[0].blocks[0].id, "block-0");
  const chronological = orderedCoverageDays(view.days, true);
  assert.deepEqual(
    chronological[0].blocks.map((block) => block.id),
    ["block-0", "block-1", "block-2"],
  );
  assert.equal(view.days[0].blocks[0].id, "block-0");
});
test("Días/bloques inactivos y selecciones false no cuentan", async () => {
  const overview = await service.overview(token, campaign);
  assert.equal(overview.days.length, 2);
  assert.equal(overview.days.flatMap((day) => day.blocks).length, 5);
  const rows = await service.participants(token, campaign, {
    blockId: "block-0",
  });
  assert.equal(rows.total, 6);
  assert.ok(rows.rows.every((row) => row.registrationId !== reg(30)));
  await assert.rejects(
    service.participants(token, campaign, { blockId: "block-5" }),
    denied(400),
  );
});
test("Inscripciones activas por defecto, paginación 25, sin teléfono ni otra campaña", async () => {
  const first = await service.participants(token, campaign),
    second = await service.participants(token, campaign, { page: 2 });
  assert.equal(first.total, 78);
  assert.equal(first.rows.length, 25);
  assert.equal(second.rows.length, 25);
  assert.equal(
    new Set([...first.rows, ...second.rows].map((row) => row.registrationId))
      .size,
    50,
  );
  assert.ok(
    first.rows.every(
      (row) =>
        row.registrationStatus === "active" &&
        row.registrationId !== "foreign-registration",
    ),
  );
  assert.doesNotMatch(JSON.stringify(first), /phone|\+569/);
  noSecrets(first);
  assert.ok(JSON.stringify(first).length < 20000);
});
test("Filtros withdrawn/cancelled y máximo de turnos null preservado", async () => {
  assert.equal(
    (await service.participants(token, campaign, { status: "withdrawn" }))
      .rows[0].registrationId,
    reg(78),
  );
  assert.equal(
    (await service.participants(token, campaign, { status: "cancelled" }))
      .rows[0].registrationId,
    reg(79),
  );
  assert.equal((await service.detail(token, campaign, reg(0))).maxTurns, null);
});
test("Búsqueda server-side tolerante a acentos y mayúsculas", async () => {
  const rows = await service.participants(token, campaign, {
    q: "  JOSE ALVAREZ ",
  });
  assert.equal(rows.total, 1);
  assert.equal(rows.rows[0].registrationId, reg(0));
});
test("Teléfono normalizado solo para búsqueda completa y nunca en listado", async () => {
  const rows = await service.participants(token, campaign, {
    q: "9 4000 0000",
  });
  assert.equal(rows.total, 1);
  assert.equal(rows.rows[0].registrationId, reg(0));
  assert.doesNotMatch(JSON.stringify(rows), /phone|\+569/);
  await assert.rejects(
    service.participants(token, campaign, { q: "9400" }),
    denied(400),
  );
});
test("Búsqueda HTTP privada fuera de URL y transporte inválido no omite autorización", async () => {
  const url = `http://localhost/api/campanas/admin/campaigns/${campaign}/participants`;
  const response = await participantsGET(
    new NextRequest(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Campaign-Search": encodeURIComponent(fixturePhone(0)),
      },
    }),
    context(),
  );
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.total, 1);
  assert.equal(data.rows[0].registrationId, reg(0));
  assert.doesNotMatch(JSON.stringify(data), /phone|\+569/);
  assert.equal(
    (
      await participantsGET(
        new NextRequest(url, {
          headers: { "X-Campaign-Search": "%malformed" },
        }),
        context(),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await participantsGET(
        new NextRequest(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Campaign-Search": "%malformed",
          },
        }),
        context(),
      )
    ).status,
    400,
  );
});
test("Filtros combinados congregación, día, bloque, estado y nombre", async () => {
  const result = await service.participants(token, campaign, {
    congregationId: "cong-0",
    dayId: "day-0",
    blockId: "block-0",
    q: "jose",
    status: "active",
    link: "accepted",
  });
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].registrationId, reg(0));
  assert.equal(
    (await service.participants(token, campaign, { dayId: "day-1" })).total,
    18,
  );
  assert.equal(
    (await service.participants(token, campaign, { congregationId: "cong-0" }))
      .total,
    20,
  );
});
test("Filtros vínculo: pendientes, accepted, conflicto y sin vínculo", async () => {
  assert.equal(
    (await service.participants(token, campaign, { link: "pending" })).total,
    2,
  );
  assert.equal(
    (await service.participants(token, campaign, { link: "accepted" })).total,
    4,
  );
  assert.equal(
    (await service.participants(token, campaign, { link: "conflict" })).total,
    2,
  );
  assert.equal(
    (await service.participants(token, campaign, { link: "none" })).total,
    72,
  );
});
test("Ficha: teléfono autorizado, disponibilidad histórica y accepted obligatorio", async () => {
  const detail = await service.detail(token, campaign, reg(0));
  assert.equal(detail.phone, fixturePhone(0));
  assert.equal(detail.availableBlockCount, 3);
  assert.equal(detail.availability.length, 6);
  assert.equal(detail.availability.filter((block) => !block.active).length, 3);
  assert.equal(detail.accepted?.otherRegistrationId, reg(1));
  assert.equal(detail.pairRequests[0].sharedBlocks.length, 3);
  noSecrets(detail);
});
test("Conflicto accepted visible sin cancelar ni modificar disponibilidades", async () => {
  const before = (
    await db.collection("pairRequests").doc("accepted-conflict").get()
  ).data();
  const detail = await service.detail(token, campaign, reg(2));
  assert.equal(detail.accepted?.availabilityConflict, true);
  assert.equal(detail.pairRequests[0].sharedBlocks.length, 0);
  assert.deepEqual(
    (await db.collection("pairRequests").doc("accepted-conflict").get()).data(),
    before,
  );
});
test("Pendientes enviados/recibidos; rejected/cancelled no cuentan", async () => {
  assert.equal((await service.detail(token, campaign, reg(3))).pendingSent, 1);
  assert.equal(
    (await service.detail(token, campaign, reg(4))).pendingReceived,
    1,
  );
  assert.equal((await service.detail(token, campaign, reg(5))).pendingSent, 0);
  assert.equal((await service.detail(token, campaign, reg(7))).pendingSent, 0);
});
test("Campaña/inscripción ajena, filtros inválidos y vacíos sin filtraciones", async () => {
  await assert.rejects(
    service.detail(token, campaign, "foreign-registration"),
    denied(404),
  );
  await assert.rejects(service.overview(token, "missing"), denied(404));
  await assert.rejects(
    service.participants(token, campaign, { dayId: "undefined-day" }),
    denied(400),
  );
  await assert.rejects(
    service.participants(token, campaign, { unknown: "forbidden" }),
    denied(400),
  );
  assert.equal(
    (await service.participants(token, campaign, { q: "nombre inexistente" }))
      .total,
    0,
  );
});
test("Draft vacío y todos los estados consultables sin transición", async () => {
  for (const status of [
    "draft",
    "registration_open",
    "planning",
    "published",
    "active",
    "completed",
  ]) {
    await db.collection("campaigns").doc("empty-draft").update({ status });
    const overview = await service.overview(token, "empty-draft");
    assert.equal(overview.campaign.status, status);
    assert.deepEqual(overview.days, []);
    assert.equal(overview.metrics.activeRegistrations, 0);
    assert.equal((await service.participants(token, "empty-draft")).total, 0);
  }
  await db
    .collection("campaigns")
    .doc("empty-draft")
    .update({ status: "draft" });
});
test("Bulk reads: 7 consultas + 2 getAll, field masks sin hashes ni teléfonos", async () => {
  let gets = 0;
  const masks: string[][] = [];
  const instrumented = new Proxy(db, {
    get(target, property) {
      if (property === "runTransaction")
        return (callback: (tx: Transaction) => Promise<unknown>) =>
          target.runTransaction((tx) =>
            callback(
              new Proxy(tx, {
                get(transaction, key) {
                  if (key === "get")
                    return (...args: Parameters<Transaction["get"]>) => {
                      gets++;
                      return transaction.get(...args);
                    };
                  if (key === "getAll")
                    return (...args: Parameters<Transaction["getAll"]>) => {
                      masks.push(
                        (args.at(-1) as { fieldMask: string[] }).fieldMask,
                      );
                      return transaction.getAll(...args);
                    };
                  const value = Reflect.get(transaction, key);
                  return typeof value === "function"
                    ? value.bind(transaction)
                    : value;
                },
              }),
            ),
          );
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Firestore;
  await new CampaignAdminDashboardService(instrumented).overview(
    token,
    campaign,
  );
  assert.equal(gets, 7);
  assert.equal(masks.length, 2);
  assert.ok(
    masks.flat().every((field) => !/phone|hash|session|pin/i.test(field)),
  );
});
test("Actualización refleja inscripción, maxTurns, Availability y PairRequest actuales", async () => {
  const batch = db.batch();
  batch.set(db.collection("participants").doc("new-person"), {
    fullName: "Nuevo Ficticio",
    active: true,
    congregationId: "cong-0",
  });
  batch.set(db.collection("campaignRegistrations").doc("new-registration"), {
    campaignId: campaign,
    participantId: "new-person",
    registrationStatus: "active",
    maxTurns: 1,
  });
  batch.set(db.collection("availabilities").doc("new-availability"), {
    campaignId: campaign,
    registrationId: "new-registration",
    timeBlockId: "block-0",
    available: true,
  });
  batch.update(db.collection("campaignRegistrations").doc(reg(0)), {
    maxTurns: 3,
  });
  batch.update(db.collection("pairRequests").doc("pending"), {
    status: "cancelled",
  });
  await batch.commit();
  const overview = await service.overview(token, campaign);
  assert.equal(overview.metrics.activeRegistrations, 79);
  assert.equal(overview.metrics.pendingRequests, 0);
  assert.equal(
    overview.days
      .flatMap((day) => day.blocks)
      .find((block) => block.id === "block-0")!.coverage.availableCount,
    7,
  );
  assert.equal(
    (await service.participants(token, campaign, { q: "Nuevo" })).total,
    1,
  );
  assert.equal((await service.detail(token, campaign, reg(0))).maxTurns, 3);
  await seedDashboardFixture();
  await Promise.all([
    db.collection("participants").doc("new-person").delete(),
    db.collection("campaignRegistrations").doc("new-registration").delete(),
    db.collection("availabilities").doc("new-availability").delete(),
  ]);
});
test("Rules siguen negando colecciones privadas incluso al cliente campaign_admin", async () => {
  for (const name of [
    "participants",
    "campaignRegistrations",
    "availabilities",
    "pairRequests",
    "campaignPairRequestLocks",
    "deviceSessions",
    "campaignAuthLimits",
  ])
    await assertFails(
      getDocs(
        collection(
          env
            .authenticatedContext("dashboard-organizer", {
              campaign_admin: true,
            })
            .firestore(),
          name,
        ),
      ),
    );
});
test("Claim retirado y cuenta deshabilitada rechazan token previamente autorizado", async () => {
  const auth = getAuth(campaignsAdminApp()),
    uid = "dashboard-organizer";
  token = await fixtureToken();
  try {
    await auth.setCustomUserClaims(uid, {});
    await assert.rejects(service.overview(token, campaign), denied(403));
    await auth.setCustomUserClaims(uid, { campaign_admin: true });
    await auth.updateUser(uid, { disabled: true });
    await assert.rejects(
      service.overview(token, campaign),
      (error: unknown) =>
        error instanceof AuthError && [401, 403].includes(error.status),
    );
  } finally {
    await auth.updateUser(uid, { disabled: false });
    await auth.setCustomUserClaims(uid, { campaign_admin: true });
    token = await fixtureToken();
  }
});
test("Revocación real de sesión Firebase invalida ID token anterior", async () => {
  const old = await fixtureToken();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await getAuth(campaignsAdminApp()).revokeRefreshTokens("dashboard-organizer");
  await assert.rejects(service.overview(old, campaign), denied(401));
});
