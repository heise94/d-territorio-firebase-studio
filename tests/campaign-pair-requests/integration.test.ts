import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, beforeEach, after, test } from "node:test";
import { initializeApp, deleteApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { NextRequest } from "next/server";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import { SESSION_COOKIE } from "../../src/modules/campaigns/server/auth/session";
import {
  CampaignRegistrationService,
  registrationId,
} from "../../src/modules/campaigns/server/registration-service";
import {
  PairRequestService,
  pairLockCollection,
  pairLimits,
} from "../../src/modules/campaigns/server/pair-request-service";

assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST,
  "Local emulator required; never production",
);
const projectId = "demo-campaign-auth";
const secret = "integration-test-only-secret-not-production";
const app = initializeApp({ projectId }, "campaign-pair-tests");
const db = getFirestore(app);
const auth = new ParticipantAuthService(db, secret);
const registrations = new CampaignRegistrationService(db, auth);
const pairs = new PairRequestService(db, auth);
type Identity = Awaited<ReturnType<typeof auth.register>>;
let a: Identity, b: Identity, c: Identity, d: Identity, u: Identity;
let env: RulesTestEnvironment;
const reg = (campaign: string, person: Identity) =>
  registrationId(campaign, person.participant.id);
const create = (token: string, campaign: string, recipient: Identity) =>
  pairs.mutate(token, campaign, {
    action: "create",
    recipientRegistrationId: reg(campaign, recipient),
  });
const act = (
  token: string,
  campaign: string,
  requestId: string,
  action: "accept" | "reject" | "cancel",
) => pairs.mutate(token, campaign, { action, requestId });
const selection = (campaign: string, blocks = ["early"]) => ({
  congregationId: "demo",
  maxTurns: 2,
  timeBlockIds: blocks.map((id) => `${campaign}-${id}`),
});
async function setup(campaign: string, people = [a, b, c, d]) {
  await db
    .collection("campaigns")
    .doc(campaign)
    .set({
      name: `Campaña ficticia ${campaign}`,
      status: "registration_open",
      defaultCapacityPerBlock: 1,
    });
  await db
    .collection("campaignCongregations")
    .doc(campaign)
    .set({ campaignId: campaign, congregationId: "demo" });
  await db
    .collection("campaignDays")
    .doc(`${campaign}-day`)
    .set({ campaignId: campaign, active: true, date: "2026-10-30" });
  for (const [id, start, end] of [
    ["early", "08:00", "10:00"],
    ["late", "10:00", "12:00"],
  ])
    await db
      .collection("timeBlocks")
      .doc(`${campaign}-${id}`)
      .set({
        campaignId: campaign,
        campaignDayId: `${campaign}-day`,
        active: true,
        startTime: start,
        endTime: end,
      });
  for (const person of people)
    await registrations.save(person.token, campaign, selection(campaign));
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
  await db
    .collection("congregations")
    .doc("demo")
    .set({ name: "Congregación ficticia", active: true });
  const profile = (fullName: string, phone: string) => ({
    fullName,
    phone,
    pin: "1234",
    confirmPin: "1234",
    congregationId: "demo",
  });
  a = await auth.register(profile("Alicia Ficticia", "913111121"));
  b = await auth.register(profile("José Ficticio", "913111122"));
  c = await auth.register(profile("Carlos Ficticio", "913111123"));
  d = await auth.register(profile("Daniela Ficticia", "913111124"));
  u = await auth.register(profile("Usuario no inscrito", "913111125"));
});
after(async () => {
  await env?.cleanup();
  for (const running of getApps()) {
    await getFirestore(running).terminate();
    await deleteApp(running);
  }
});
beforeEach(async () => {
  // Each scenario has its own 15-minute budget; concurrency within a scenario is real.
  const limits = await db.collection("campaignAuthLimits").get();
  const batch = db.batch();
  for (const doc of limits.docs) batch.delete(doc.ref);
  await batch.commit();
});
test("Búsqueda privada: misma campaña/active, excluye propio, acentos y DTO mínimo", async () => {
  await setup("search", [a, b, c]);
  await setup("elsewhere", [d]);
  const result = await pairs.search(a.token, "search", "JOsE");
  assert.deepEqual(result, [
    {
      registrationId: reg("search", b),
      fullName: b.participant.fullName,
      congregation: "Congregación ficticia",
    },
  ]);
  assert.equal((await pairs.search(a.token, "search", "Alicia")).length, 0);
  assert.equal((await pairs.search(a.token, "search", "Daniela")).length, 0);
  await db
    .collection("campaignRegistrations")
    .doc(reg("search", c))
    .update({ registrationStatus: "withdrawn" });
  assert.equal((await pairs.search(a.token, "search", "Carlos")).length, 0);
  await db
    .collection("participants")
    .doc(b.participant.id)
    .update({ active: false });
  assert.equal((await pairs.search(a.token, "search", "Jose")).length, 0);
  await db
    .collection("participants")
    .doc(b.participant.id)
    .update({ active: true });
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    b.participant.id,
    "phone",
    "pin",
    "maxTurns",
    "availability",
    "913111122",
  ])
    assert.ok(!serialized.includes(forbidden));
  for (const query of ["", "j", "x".repeat(81)])
    await assert.rejects(pairs.search(a.token, "search", query));
  await assert.rejects(pairs.search(u.token, "search", "Jose"));
});
test("Búsqueda limita a 10 sin descargar directorio al cliente", async () => {
  await setup("limit-search", [a]);
  for (let i = 0; i < 12; i++) {
    const participantId = `search-fixture-${i}`;
    await db
      .collection("participants")
      .doc(participantId)
      .set({
        fullName: `Coincidencia ficticia ${i}`,
        active: true,
        congregationId: "demo",
      });
    const id = registrationId("limit-search", participantId);
    await db
      .collection("campaignRegistrations")
      .doc(id)
      .set({
        id,
        campaignId: "limit-search",
        participantId,
        registrationStatus: "active",
      });
  }
  assert.equal(
    (await pairs.search(a.token, "limit-search", "coincidencia")).length,
    10,
  );
});
test("Crear válida: pending y auditoría mínima sin Assignment ni cambios de Availability", async () => {
  await setup("create");
  const beforeAvailability = (
    await db
      .collection("availabilities")
      .where("campaignId", "==", "create")
      .get()
  ).docs.map((doc) => doc.data());
  const request = await create(a.token, "create", b);
  assert.equal(request.status, "pending");
  const stored = (
    await db.collection("pairRequests").doc(request.id).get()
  ).data()!;
  assert.equal(stored.requesterRegistrationId, reg("create", a));
  assert.equal(stored.recipientRegistrationId, reg("create", b));
  assert.deepEqual(
    (
      await db
        .collection("availabilities")
        .where("campaignId", "==", "create")
        .get()
    ).docs.map((doc) => doc.data()),
    beforeAvailability,
  );
  assert.equal((await db.collection("campaignAssignments").get()).size, 0);
  const audits = (
    await db.collection("auditLogs").where("entityId", "==", request.id).get()
  ).docs.map((doc) => doc.data());
  assert.equal(audits[0].event, "pair_request_created");
  assert.equal(audits[0].actorId, a.participant.id);
  assert.ok(!JSON.stringify({ stored, audits }).includes("phone"));
});
test("Crear rechaza self/ajeno/no inscrito/inyección y registros inactivos", async () => {
  await setup("invalid");
  await setup("other", [d]);
  await assert.rejects(create(a.token, "invalid", a));
  await assert.rejects(
    pairs.mutate(a.token, "invalid", {
      action: "create",
      recipientRegistrationId: reg("other", d),
    }),
  );
  await assert.rejects(create(a.token, "invalid", u));
  await assert.rejects(create(u.token, "invalid", b));
  for (const field of ["requesterRegistrationId", "requesterParticipantId"])
    await assert.rejects(
      pairs.mutate(a.token, "invalid", {
        action: "create",
        recipientRegistrationId: reg("invalid", b),
        [field]: "injected",
      }),
    );
  await db
    .collection("campaignRegistrations")
    .doc(reg("invalid", b))
    .update({ registrationStatus: "cancelled" });
  await assert.rejects(create(a.token, "invalid", b));
  await db
    .collection("campaignRegistrations")
    .doc(reg("invalid", a))
    .update({ registrationStatus: "withdrawn" });
  await assert.rejects(create(a.token, "invalid", c));
  await assert.rejects(create("invalid-token", "invalid", b));
});
test("A→B y B→A concurrentes: una relación pendiente lógica", async () => {
  await setup("crossed");
  const results = await Promise.allSettled([
    create(a.token, "crossed", b),
    create(b.token, "crossed", a),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    (
      await db
        .collection("pairRequests")
        .where("campaignId", "==", "crossed")
        .get()
    ).size,
    1,
  );
  await assert.rejects(create(a.token, "crossed", b), /Ya existe/);
});
test("Aceptar solo receptor; accepted obligatorio no cancelable unilateralmente", async () => {
  await setup("accept");
  const request = await create(a.token, "accept", b);
  await assert.rejects(act(a.token, "accept", request.id, "accept"));
  await assert.rejects(act(c.token, "accept", request.id, "accept"));
  assert.equal(
    (await act(b.token, "accept", request.id, "accept")).status,
    "accepted",
  );
  for (const person of [a, b])
    await assert.rejects(act(person.token, "accept", request.id, "cancel"));
  await assert.rejects(act(b.token, "accept", request.id, "reject"));
  await assert.rejects(create(c.token, "accept", a), /vínculo aceptado/);
  const view = await pairs.view(a.token, "accept");
  assert.equal(view.requests[0].status, "accepted");
  assert.equal(view.requests[0].sharedBlocks.length, 1);
  assert.equal(view.requests[0].availabilityConflict, false);
});
test("Aceptación incompatible concurrente: solo una accepted, otra permanece pending", async () => {
  await setup("concurrent");
  const ab = await create(a.token, "concurrent", b);
  const cb = await create(c.token, "concurrent", b);
  const results = await Promise.allSettled([
    act(b.token, "concurrent", ab.id, "accept"),
    act(b.token, "concurrent", cb.id, "accept"),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const statuses = (
    await db
      .collection("pairRequests")
      .where("campaignId", "==", "concurrent")
      .get()
  ).docs
    .map((doc) => doc.data().status)
    .sort();
  assert.deepEqual(statuses, ["accepted", "pending"]);
  const pending = (await pairs.view(b.token, "concurrent")).requests.find(
    (request) => request.status === "pending",
  )!;
  await assert.rejects(
    act(b.token, "concurrent", pending.id, "accept"),
    /otro vínculo/,
  );
});
test("Dos receptores aceptan al mismo emisor: exclusividad protege ambos extremos", async () => {
  await setup("two-recipients");
  const ab = await create(a.token, "two-recipients", b),
    ac = await create(a.token, "two-recipients", c);
  const results = await Promise.allSettled([
    act(b.token, "two-recipients", ab.id, "accept"),
    act(c.token, "two-recipients", ac.id, "accept"),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
});
test("Rechazar solo receptor, cancelar solo emisor; reenvío conserva historia", async () => {
  await setup("history");
  const first = await create(a.token, "history", b);
  await assert.rejects(act(a.token, "history", first.id, "reject"));
  await assert.rejects(act(b.token, "history", first.id, "cancel"));
  assert.equal(
    (await act(b.token, "history", first.id, "reject")).status,
    "rejected",
  );
  const second = await create(a.token, "history", b);
  assert.notEqual(first.id, second.id);
  assert.equal(
    (await act(a.token, "history", second.id, "cancel")).status,
    "cancelled",
  );
  const third = await create(b.token, "history", a);
  assert.notEqual(third.id, second.id);
  assert.deepEqual(
    (
      await db
        .collection("pairRequests")
        .where("campaignId", "==", "history")
        .get()
    ).docs
      .map((doc) => doc.data().status)
      .sort(),
    ["cancelled", "pending", "rejected"],
  );
  for (const id of [first.id, second.id])
    assert.ok(
      (await db.collection("pairRequests").doc(id).get()).data()!
        .respondedAt instanceof Timestamp,
    );
  const events = (
    await db.collection("auditLogs").where("campaignId", "==", "history").get()
  ).docs.map((doc) => doc.data().event);
  assert.ok(
    events.includes("pair_request_rejected") &&
      events.includes("pair_request_cancelled"),
  );
});
test("Sin overlap puede aceptar; cambios actuales generan/eliminan conflicto sin romper vínculo", async () => {
  await setup("overlap");
  await registrations.save(b.token, "overlap", selection("overlap", ["late"]));
  const request = await create(a.token, "overlap", b);
  assert.equal(
    (await pairs.view(a.token, "overlap")).requests[0].availabilityConflict,
    true,
  );
  await act(b.token, "overlap", request.id, "accept");
  await registrations.save(a.token, "overlap", selection("overlap", ["late"]));
  assert.equal(
    (await pairs.view(a.token, "overlap")).requests[0].availabilityConflict,
    false,
  );
  await registrations.save(a.token, "overlap", selection("overlap", ["early"]));
  const view = (await pairs.view(a.token, "overlap")).requests[0];
  assert.equal(view.status, "accepted");
  assert.equal(view.availabilityConflict, true);
  assert.equal(
    (await registrations.view(a.token, "overlap")).days[0].blocks.find(
      (block) => block.id === "overlap-early",
    )!.coverage.isFull,
    true,
  );
});
test("Overlap excluye bloques/días inactivos y otra campaña; no expone selección completa", async () => {
  await setup("active-blocks");
  const request = await create(a.token, "active-blocks", b);
  await registrations.save(
    b.token,
    "active-blocks",
    selection("active-blocks", ["early", "late"]),
  );
  let view = (await pairs.view(a.token, "active-blocks")).requests[0];
  assert.equal(view.sharedBlocks.length, 1);
  assert.ok(!JSON.stringify(view).includes("active-blocks-late"));
  await db
    .collection("timeBlocks")
    .doc("active-blocks-early")
    .update({ active: false });
  assert.equal(
    (await pairs.view(a.token, "active-blocks")).requests[0]
      .availabilityConflict,
    true,
  );
  await db
    .collection("timeBlocks")
    .doc("active-blocks-early")
    .update({ active: true });
  await db
    .collection("campaignDays")
    .doc("active-blocks-day")
    .update({ active: false });
  assert.equal(
    (await pairs.view(a.token, "active-blocks")).requests[0].sharedBlocks
      .length,
    0,
  );
  await act(b.token, "active-blocks", request.id, "reject");
});
test("Revalidar inscripciones y perfiles al aceptar; accepted se conserva ante retiro", async () => {
  await setup("revalidate");
  const request = await create(a.token, "revalidate", b);
  await db
    .collection("participants")
    .doc(a.participant.id)
    .update({ active: false });
  await assert.rejects(
    act(b.token, "revalidate", request.id, "accept"),
    /Ambas personas/,
  );
  await db
    .collection("participants")
    .doc(a.participant.id)
    .update({ active: true });
  await db
    .collection("campaignRegistrations")
    .doc(reg("revalidate", a))
    .update({ registrationStatus: "withdrawn" });
  await assert.rejects(act(b.token, "revalidate", request.id, "accept"));
  await db
    .collection("campaignRegistrations")
    .doc(reg("revalidate", a))
    .update({ registrationStatus: "active" });
  await act(b.token, "revalidate", request.id, "accept");
  await db
    .collection("campaignRegistrations")
    .doc(reg("revalidate", a))
    .update({ registrationStatus: "withdrawn" });
  const view = (await pairs.view(b.token, "revalidate")).requests[0];
  assert.equal(view.status, "accepted");
  assert.equal(view.participationConflict, true);
});
test("Todos los estados cerrados rechazan mutaciones y búsqueda; draft invisible", async () => {
  await setup("closed");
  const request = await create(a.token, "closed", b);
  await pairs.view(b.token, "closed");
  for (const status of [
    "planning",
    "published",
    "active",
    "completed",
    "draft",
  ]) {
    await db.collection("campaigns").doc("closed").update({ status });
    await assert.rejects(act(b.token, "closed", request.id, "accept"));
    await assert.rejects(act(b.token, "closed", request.id, "reject"));
    await assert.rejects(act(a.token, "closed", request.id, "cancel"));
    await assert.rejects(create(a.token, "closed", c));
    await assert.rejects(pairs.search(a.token, "closed", "Jose"));
    if (status === "draft") {
      await assert.rejects(pairs.view(a.token, "closed"));
      assert.ok(
        !(await pairs.inbox(b.token)).some(
          (group) => group.campaignId === "closed",
        ),
      );
    } else assert.equal((await pairs.view(a.token, "closed")).editable, false);
  }
});
test("Aislamiento propio/inbox prioritario y Rules niegan leer/listar/crear/actualizar", async () => {
  await setup("privacy");
  const own = await create(a.token, "privacy", b),
    foreign = await create(c.token, "privacy", d);
  const view = await pairs.view(a.token, "privacy");
  assert.equal(view.requests.length, 1);
  assert.equal(view.requests[0].id, own.id);
  assert.ok(!JSON.stringify(view).includes(foreign.id));
  for (const field of [
    "phone",
    "pinHash",
    "maxTurns",
    b.participant.id,
    c.participant.fullName,
  ])
    assert.ok(!JSON.stringify(view).includes(field));
  await assert.rejects(act(a.token, "privacy", foreign.id, "cancel"));
  const inbox = (await pairs.inbox(b.token)).find(
    (group) => group.campaignId === "privacy",
  )!;
  assert.equal(inbox.count, 1);
  assert.deepEqual(inbox.senderNames, [a.participant.fullName]);
  await act(b.token, "privacy", own.id, "reject");
  assert.ok(
    !(await pairs.inbox(b.token)).some(
      (group) => group.campaignId === "privacy",
    ),
  );
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("participant"),
    env.authenticatedContext("organizer", { campaign_admin: true }),
  ]) {
    for (const name of ["pairRequests", pairLockCollection]) {
      await assertFails(getDocs(collection(context.firestore(), name)));
      await assertFails(getDoc(doc(context.firestore(), name, own.id)));
      await assertFails(
        setDoc(doc(context.firestore(), name, "injected"), {
          status: "accepted",
        }),
      );
      await assertFails(
        updateDoc(doc(context.firestore(), name, own.id), {
          status: "accepted",
        }),
      );
    }
  }
});
test("API real: cookie/CSRF/no-store, campos inyectados y sesión revocada", async () => {
  await setup("api");
  process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
  process.env.CAMPAIGNS_AUTH_SECRET = secret;
  process.env.CAMPAIGNS_APP_ORIGIN = "http://localhost:3000";
  const { GET, POST } = await import(
    "../../src/app/api/campanas/participant/campaigns/[campaignId]/pair-requests/route"
  );
  const { GET: search } = await import(
    "../../src/app/api/campanas/participant/campaigns/[campaignId]/pair-candidates/route"
  );
  const { GET: inbox } = await import(
    "../../src/app/api/campanas/participant/pair-inbox/route"
  );
  const context = { params: Promise.resolve({ campaignId: "api" }) };
  const body = { action: "create", recipientRegistrationId: reg("api", b) };
  const request = (
    input: unknown,
    token = a.token,
    origin = "http://localhost:3000",
  ) =>
    new NextRequest(
      "http://localhost:3000/api/campanas/participant/campaigns/api/pair-requests",
      {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${token}`,
          origin,
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
  assert.equal(
    (await POST(request(body, a.token, "https://attacker.invalid"), context))
      .status,
    403,
  );
  assert.equal(
    (
      await POST(
        request({ ...body, requesterRegistrationId: reg("api", c) }),
        context,
      )
    ).status,
    400,
  );
  assert.equal((await POST(request(body), context)).status, 200);
  const getRequest = new NextRequest(
    "http://localhost:3000/api/campanas/participant/campaigns/api/pair-requests",
    { headers: { cookie: `${SESSION_COOKIE}=${a.token}` } },
  );
  const result = await GET(getRequest, context);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal(result.headers.get("vary"), "Cookie");
  assert.equal(
    (await GET(new NextRequest(getRequest.url), context)).status,
    401,
  );
  const searched = await search(
    new NextRequest(
      "http://localhost:3000/api/campanas/participant/campaigns/api/pair-candidates?q=Jose",
      { headers: { cookie: `${SESSION_COOKIE}=${a.token}` } },
    ),
    context,
  );
  assert.equal(searched.status, 200);
  assert.equal((await searched.json()).candidates.length, 1);
  assert.equal(
    (
      await inbox(
        new NextRequest(
          "http://localhost:3000/api/campanas/participant/pair-inbox",
          { headers: { cookie: `${SESSION_COOKIE}=${b.token}` } },
        ),
      )
    ).status,
    200,
  );
  await auth.revokeAll(d.participant.id);
  assert.equal(
    (
      await GET(
        new NextRequest(getRequest.url, {
          headers: { cookie: `${SESSION_COOKIE}=${d.token}` },
        }),
        context,
      )
    ).status,
    401,
  );
});
test("Límites individuales distribuidos: budgets search/create/respond y otro participante libre", async () => {
  for (const [action, maximum] of Object.entries(pairLimits)) {
    for (let i = 0; i < maximum; i++)
      await auth.limit(`pair-${action}`, u.participant.id, maximum);
    const operation =
      action === "search"
        ? pairs.search(u.token, "search", "Jose")
        : pairs.mutate(
            u.token,
            "search",
            action === "create"
              ? { action: "create", recipientRegistrationId: reg("search", b) }
              : { action: "reject", requestId: "missing" },
          );
    await assert.rejects(operation, (error: any) => error.status === 429);
  }
  assert.equal((await pairs.search(b.token, "search", "Alicia")).length, 1);
});
