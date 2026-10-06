import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, after, test } from "node:test";
import { initializeApp, deleteApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { NextRequest } from "next/server";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import {
  CampaignRegistrationService,
  registrationId,
  availabilityId,
} from "../../src/modules/campaigns/server/registration-service";
import { SESSION_COOKIE } from "../../src/modules/campaigns/server/auth/session";

assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST,
  "Run using firebase emulators:exec; production is never allowed",
);
const projectId = "demo-campaign-auth";
const secret = "integration-test-only-secret-not-production";
const app = initializeApp({ projectId }, "campaign-registration-tests");
const db = getFirestore(app);
const auth = new ParticipantAuthService(db, secret);
const service = new CampaignRegistrationService(db, auth);
let env: RulesTestEnvironment;
let a: Awaited<ReturnType<typeof auth.register>>;
let b: Awaited<ReturnType<typeof auth.register>>;
let c: Awaited<ReturnType<typeof auth.register>>;
const input = (
  blocks: string[] = ["early"],
  maxTurns: 1 | 2 | 3 | null = 2,
  congregationId = "associated",
) => ({ timeBlockIds: blocks, maxTurns, congregationId });
async function campaign(
  id: string,
  status = "registration_open",
  capacity: number | undefined = 2,
) {
  await db
    .collection("campaigns")
    .doc(id)
    .set({
      name: `Campaña ficticia ${id}`,
      status,
      ...(capacity !== undefined ? { defaultCapacityPerBlock: capacity } : {}),
    });
  await db
    .collection("campaignDays")
    .doc(`${id}-day`)
    .set({ campaignId: id, date: "2026-10-30", active: true });
  await db
    .collection("timeBlocks")
    .doc(`${id}-block`)
    .set({
      campaignId: id,
      campaignDayId: `${id}-day`,
      active: true,
      startTime: "08:00",
      endTime: "10:00",
    });
  await db
    .collection("campaignCongregations")
    .doc(`${id}-association`)
    .set({ campaignId: id, congregationId: "associated" });
}
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: Number(port),
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
  await env.clearFirestore();
  for (const [id, active] of [
    ["associated", true],
    ["associated-two", true],
    ["unassociated", true],
    ["inactive", false],
  ] as const)
    await db
      .collection("congregations")
      .doc(id)
      .set({ name: `Congregación ficticia ${id}`, active });
  await campaign("open");
  await campaign("other");
  await campaign("draft", "draft");
  await db
    .collection("campaignCongregations")
    .doc("open-two")
    .set({ campaignId: "open", congregationId: "associated-two" });
  await db
    .collection("campaignCongregations")
    .doc("open-inactive")
    .set({ campaignId: "open", congregationId: "inactive" });
  await db
    .collection("campaignDays")
    .doc("inactive-day")
    .set({ campaignId: "open", date: "2026-10-31", active: false });
  for (const [id, active, dayId, override] of [
    ["early", true, "open-day", 1],
    ["late", true, "open-day", undefined],
    ["inactive-block", false, "open-day", undefined],
    ["inactive-day-block", true, "inactive-day", undefined],
  ] as const) {
    await db
      .collection("timeBlocks")
      .doc(id)
      .set({
        campaignId: "open",
        campaignDayId: dayId,
        active,
        startTime: "10:00",
        endTime: "12:00",
        ...(override !== undefined ? { capacityOverride: override } : {}),
      });
  }
  a = await auth.register({
    fullName: "Persona ficticia A",
    phone: "913111111",
    pin: "1234",
    confirmPin: "1234",
    congregationId: "associated",
  });
  b = await auth.register({
    fullName: "Persona ficticia B",
    phone: "913111112",
    pin: "1234",
    confirmPin: "1234",
  });
  c = await auth.register({
    fullName: "Persona ficticia C",
    phone: "913111113",
    pin: "1234",
    confirmPin: "1234",
  });
});
after(async () => {
  await env?.cleanup();
  await db.terminate();
  await deleteApp(app);
  const serverApp = getApps().find(
    (candidate) => candidate.name === "campaigns-server",
  );
  if (serverApp) {
    await getFirestore(serverApp).terminate();
    await deleteApp(serverApp);
  }
});

test("Listar varias campañas abiertas, ocultar draft y preseleccionar congregación válida", async () => {
  assert.deepEqual(
    (await service.list(a.token)).map((row) => row.id),
    ["open", "other"],
  );
  const view = await service.view(a.token, "open");
  assert.equal(view.congregationId, "associated");
  assert.deepEqual(
    view.congregations.map((row) => row.id),
    ["associated", "associated-two"],
  );
  assert.equal(view.days.length, 1);
  assert.ok(
    view.days
      .flatMap((day) => day.blocks)
      .every((block) => !block.id.includes("inactive")),
  );
  await assert.rejects(service.view(a.token, "draft"));
});
test("Registro único concurrente y separado de identidad; guardado atómico de varios bloques", async () => {
  await Promise.all([
    service.save(a.token, "open", input(["early", "late"], 1)),
    service.save(a.token, "open", input(["early", "late"], null)),
  ]);
  const rows = await db
    .collection("campaignRegistrations")
    .where("participantId", "==", a.participant.id)
    .get();
  assert.equal(rows.size, 1);
  assert.equal(rows.docs[0].id, registrationId("open", a.participant.id));
  const saved = rows.docs[0].data();
  assert.equal(saved.registrationStatus, "active");
  assert.ok(
    !("congregationId" in saved) &&
      !("phoneNormalized" in saved) &&
      !("pinHash" in saved),
  );
  assert.equal(
    (
      await db
        .collection("availabilities")
        .where("registrationId", "==", saved.id)
        .get()
    ).size,
    2,
  );
  const original = saved.createdAt.toMillis();
  await service.save(a.token, "open", input(["late"], 3, "associated-two"));
  assert.equal(
    (await db.collection("campaignRegistrations").doc(saved.id).get())
      .data()!
      .createdAt.toMillis(),
    original,
  );
  assert.equal(
    (await db.collection("participants").doc(a.participant.id).get()).data()!
      .congregationId,
    "associated-two",
  );
  assert.equal(
    (
      await db
        .collection("availabilities")
        .doc(availabilityId(saved.id, "early"))
        .get()
    ).data()!.available,
    false,
  );
  assert.deepEqual(
    (await service.view(a.token, "open")).days.flatMap((day) =>
      day.blocks.filter((block) => block.selected).map((block) => block.id),
    ),
    ["late"],
  );
  await service.save(a.token, "open", input([], null));
  assert.equal(
    (await service.view(a.token, "open")).campaign.registration!.maxTurns,
    null,
  );
});
test("Congregación inexistente/inactiva/no asociada, bloque ajeno/inactivo/día inactivo y payloads inválidos rechazados", async () => {
  for (const congregation of ["missing", "inactive", "unassociated"])
    await assert.rejects(
      service.save(a.token, "open", input(["early"], 1, congregation)),
    );
  for (const block of [
    "missing",
    "other-block",
    "inactive-block",
    "inactive-day-block",
  ])
    await assert.rejects(service.save(a.token, "open", input([block])));
  await assert.rejects(
    service.save(a.token, "open", { ...input(), maxTurns: 0 }),
  );
  await assert.rejects(
    service.save(a.token, "open", {
      ...input(),
      timeBlockIds: ["early", "early"],
    }),
  );
  await assert.rejects(
    service.save(a.token, "open", {
      ...input(),
      participantId: b.participant.id,
    }),
  );
  assert.equal(
    (
      await db
        .collection("campaignRegistrations")
        .doc(registrationId("open", a.participant.id))
        .get()
    ).data()!.maxTurns,
    null,
  );
});
test("Cobertura concurrente: completo acepta a ambos, override/fallback y reserva derivada", async () => {
  await Promise.all([
    service.save(a.token, "open", input(["early", "late"])),
    service.save(b.token, "open", input(["early"])),
  ]);
  const view = await service.view(a.token, "open");
  const blocks = view.days.flatMap((day) => day.blocks);
  const early = blocks.find((block) => block.id === "early")!;
  assert.deepEqual(early.coverage, {
    availableCount: 2,
    capacity: 1,
    remainingCapacity: 0,
    reservePotential: 1,
    isFull: true,
    needsSupport: false,
  });
  assert.equal(
    blocks.find((block) => block.id === "late")!.coverage.capacity,
    2,
  );
  await service.save(c.token, "open", input(["early"]));
  assert.equal(
    (await service.view(c.token, "open")).days
      .flatMap((day) => day.blocks)
      .find((block) => block.id === "early")!.coverage.reservePotential,
    2,
  );
  assert.equal(
    (
      await db
        .collection("availabilities")
        .where("campaignId", "==", "open")
        .get()
    ).docs.filter(
      (doc) => doc.data().available && doc.data().timeBlockId === "early",
    ).length,
    3,
  );
  await db
    .collection("campaignRegistrations")
    .doc(registrationId("open", c.participant.id))
    .update({ registrationStatus: "withdrawn" });
  assert.equal(
    (await service.view(a.token, "open")).days
      .flatMap((day) => day.blocks)
      .find((block) => block.id === "early")!.coverage.availableCount,
    2,
  );
  await assert.rejects(service.save(c.token, "open", input()));
  await db
    .collection("campaignRegistrations")
    .doc(registrationId("open", c.participant.id))
    .update({ registrationStatus: "cancelled" });
  await assert.rejects(service.save(c.token, "open", input()));
  assert.ok((await db.collection("campaignAssignments").get()).empty);
});
test("Sin capacidad ni horarios: DTO claro, sin marcar completo ni inventar capacidad", async () => {
  await campaign("undefined-capacity", "registration_open", undefined);
  // Default arguments use 2, so remove explicitly to exercise missing configuration.
  await db
    .collection("campaigns")
    .doc("undefined-capacity")
    .set({ name: "Sin capacidad ficticia", status: "registration_open" });
  const view = await service.view(a.token, "undefined-capacity");
  assert.equal(view.days[0].blocks[0].coverage.capacity, null);
  assert.equal(view.days[0].blocks[0].coverage.isFull, false);
  await db
    .collection("timeBlocks")
    .doc("undefined-capacity-block")
    .update({ active: false });
  assert.equal(
    (await service.view(a.token, "undefined-capacity")).days.flatMap(
      (day) => day.blocks,
    ).length,
    0,
  );
});
test("Estados: formulario abierto que cambia a planning rechaza; lectura histórica propia solamente", async () => {
  await service.view(a.token, "open");
  for (const status of [
    "planning",
    "published",
    "active",
    "completed",
    "draft",
  ]) {
    await db.collection("campaigns").doc("open").update({ status });
    await assert.rejects(
      service.save(a.token, "open", input(["late"], 1)),
      /inscripciones ya se cerraron/,
    );
    if (status === "draft") await assert.rejects(service.view(a.token, "open"));
    else
      assert.equal(
        (await service.view(a.token, "open")).campaign.status,
        status,
      );
  }
  await db.collection("campaigns").doc("other").update({ status: "planning" });
  await assert.rejects(service.view(b.token, "other"));
  assert.ok(!(await service.list(b.token)).some((row) => row.id === "other"));
  await db
    .collection("campaigns")
    .doc("open")
    .update({ status: "registration_open" });
});
test("Desactivado después de abrir: rechazo de selección y preservación histórica al editar otros bloques", async () => {
  await service.view(a.token, "open");
  await db.collection("timeBlocks").doc("early").update({ active: false });
  await assert.rejects(
    service.save(a.token, "open", input(["early", "late"])),
    /horarios ya no/,
  );
  await service.save(a.token, "open", input(["late"]));
  assert.equal(
    (
      await db
        .collection("availabilities")
        .doc(availabilityId(registrationId("open", a.participant.id), "early"))
        .get()
    ).data()!.available,
    true,
  );
  assert.equal(
    (await service.view(a.token, "open")).unavailableSelectionCount,
    1,
  );
  await db.collection("timeBlocks").doc("early").update({ active: true });
  await db.collection("campaignDays").doc("open-day").update({ active: false });
  await assert.rejects(
    service.save(a.token, "open", input(["late"])),
    /horarios ya no/,
  );
  await db.collection("campaignDays").doc("open-day").update({ active: true });
});
test("Aislamiento y rules: sesión propia, DTO sin datos ajenos, sin acceso directo ni con claim admin", async () => {
  const beforeB = (
    await db
      .collection("campaignRegistrations")
      .doc(registrationId("open", b.participant.id))
      .get()
  ).data()!;
  await service.save(a.token, "open", input(["late"], 3));
  const afterB = (
    await db
      .collection("campaignRegistrations")
      .doc(registrationId("open", b.participant.id))
      .get()
  ).data()!;
  assert.equal(afterB.updatedAt.toMillis(), beforeB.updatedAt.toMillis());
  const serialized = JSON.stringify(await service.view(a.token, "open"));
  for (const forbidden of [
    b.participant.id,
    b.participant.fullName,
    registrationId("open", b.participant.id),
    "pinHash",
    "phoneNormalized",
    "tokenHash",
  ])
    assert.ok(!serialized.includes(forbidden));
  await assert.rejects(service.view("invalid-token", "open"), /sesión venció/);
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("a"),
    env.authenticatedContext("organizer", { campaign_admin: true }),
  ]) {
    for (const name of ["campaignRegistrations", "availabilities"]) {
      await assertFails(getDocs(collection(context.firestore(), name)));
      await assertFails(
        setDoc(doc(context.firestore(), name, "injected"), { available: true }),
      );
    }
    await assertFails(
      getDoc(
        doc(
          context.firestore(),
          "campaignRegistrations",
          registrationId("open", b.participant.id),
        ),
      ),
    );
  }
});
test("API: identidad de cookie, CSRF, no-store, rechazo de IDs inyectados y sesión revocada", async () => {
  process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
  process.env.CAMPAIGNS_AUTH_SECRET = secret;
  process.env.CAMPAIGNS_APP_ORIGIN = "http://localhost:3000";
  const { GET, PUT } = await import(
    "../../src/app/api/campanas/participant/campaigns/[campaignId]/route"
  );
  const { GET: list } = await import(
    "../../src/app/api/campanas/participant/campaigns/route"
  );
  const request = (
    body: unknown,
    token = a.token,
    origin = "http://localhost:3000",
  ) =>
    new NextRequest(
      "http://localhost:3000/api/campanas/participant/campaigns/open",
      {
        method: "PUT",
        headers: {
          origin,
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE}=${token}`,
        },
        body: JSON.stringify(body),
      },
    );
  const context = { params: Promise.resolve({ campaignId: "open" }) };
  assert.equal(
    (await PUT(request(input(), a.token, "https://attacker.invalid"), context))
      .status,
    403,
  );
  assert.equal(
    (
      await PUT(
        request({ ...input(), participantId: b.participant.id }),
        context,
      )
    ).status,
    400,
  );
  assert.equal(
    (await PUT(request(input(["late"], null)), context)).status,
    200,
  );
  const reply = await GET(
    new NextRequest(
      "http://localhost:3000/api/campanas/participant/campaigns/open",
      { headers: { cookie: `${SESSION_COOKIE}=${a.token}` } },
    ),
    context,
  );
  assert.equal(reply.status, 200);
  assert.equal(reply.headers.get("cache-control"), "private, no-store");
  assert.equal(
    (await reply.json()).campaign.registration.id,
    registrationId("open", a.participant.id),
  );
  assert.equal(
    (
      await list(
        new NextRequest(
          "http://localhost:3000/api/campanas/participant/campaigns",
        ),
      )
    ).status,
    401,
  );
  await auth.revokeAll(a.participant.id);
  assert.equal((await PUT(request(input()), context)).status, 401);
});
