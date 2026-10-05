import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { getApps, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { NextRequest } from "next/server";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { seedChangesFixture } from "../campaign-changes/fixture";
import {
  fixtureCampaign as campaign,
  fixtureRegistration as reg,
} from "../campaign-program/fixture";
import {
  notificationsPage,
  markNotificationsRead,
} from "../../src/modules/campaigns/server/notification-center";
import {
  subscribePush,
  unsubscribePush,
  pushStatus,
} from "../../src/modules/campaigns/server/push-subscriptions";
import {
  writeDomainNotification,
  notificationEventId,
  notificationOutbox,
  pushDeliveries,
} from "../../src/modules/campaigns/server/notification-events";
import {
  dispatchPushOutbox,
  maximumPushAttempts,
  type PushDeliveryService,
} from "../../src/modules/campaigns/server/push-delivery";
import {
  campaignTurnInstant,
  dispatchTurnReminders,
} from "../../src/modules/campaigns/server/turn-reminders";
import {
  participantAuth,
  SESSION_COOKIE,
} from "../../src/modules/campaigns/server/auth/session";
import {
  newSessionToken,
  tokenHash,
  SESSION_SECONDS,
} from "../../src/modules/campaigns/server/auth/crypto";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import { PairRequestService } from "../../src/modules/campaigns/server/pair-request-service";
import {
  registrationId,
  availabilityId,
} from "../../src/modules/campaigns/server/registration-service";
import { getPersonalProgram } from "../../src/modules/campaigns/server/program-service";
import { createChangeRequest } from "../../src/modules/campaigns/server/change-request-participant";
import {
  adminChanges,
  decideChange,
  resolveChange,
} from "../../src/modules/campaigns/server/change-request-admin";
import { safeNotificationRoute } from "../../src/modules/campaigns/domain/notification";
import { GET as noticesGET } from "../../src/app/api/campanas/participant/notifications/route";
import { GET as eventGET } from "../../src/app/api/campanas/participant/notifications/push-event/route";
import { POST as readPOST } from "../../src/app/api/campanas/participant/notifications/read/route";
import { POST as subscribePOST } from "../../src/app/api/campanas/participant/push/subscribe/route";
import { POST as jobPOST } from "../../src/app/api/internal/campanas/turn-reminders/route";

process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
assert.match(
  process.env.FIRESTORE_EMULATOR_HOST ?? "",
  /^(127\.0\.0\.1|localhost):/,
);
assert.match(
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
  /^(127\.0\.0\.1|localhost):/,
);
const db = campaignsAdminDb();
let env: RulesTestEnvironment, token: string, cookies: Record<number, string>;
const denied = (status: number) => (error: unknown) =>
  error instanceof AuthError && error.status === status;
const rows = async (
  collection: string,
): Promise<Array<FirebaseFirestore.DocumentData & { id: string }>> =>
  (await db.collection(collection).get()).docs.map((d) => ({
    ...d.data(),
    id: d.id,
  }));
const count = async (type: string, person?: string) =>
  (await rows("campaignNotifications")).filter(
    (n: any) => n.type === type && (!person || n.participantId === person),
  ).length;
const fakeToken = (suffix: string) => "FAKE_LOCAL_FCM_TOKEN_" + suffix;
const request = (
  path: string,
  cookie = cookies[7],
  body?: unknown,
  origin = "http://localhost",
) =>
  new NextRequest("http://localhost" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: `${SESSION_COOKIE}=${cookie}`,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function event(
  key = "event",
  index = 7,
  type: "assignment_changed" | "turn_reminder" = "assignment_changed",
) {
  return db.runTransaction((tx) =>
    Promise.resolve(
      writeDomainNotification(
        tx,
        db,
        key,
        `person-${index}`,
        campaign,
        type,
        "Comentario privado que nunca debe aparecer en push",
        {},
        Timestamp.now(),
        "/campanas/mi-programa",
      ),
    ),
  );
}
async function secondDevice(index = 7) {
  const cookie = newSessionToken(),
    now = Timestamp.now();
  await db
    .collection("deviceSessions")
    .doc(tokenHash(cookie))
    .set({
      id: tokenHash(cookie),
      participantId: `person-${index}`,
      sessionVersion: 0,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + SESSION_SECONDS * 1000),
    });
  return cookie;
}
function sender(failure?: unknown) {
  const calls: {
    token: string;
    payload: Parameters<PushDeliveryService["send"]>[1];
  }[] = [];
  return {
    calls,
    send: async (
      token: string,
      payload: Parameters<PushDeliveryService["send"]>[1],
    ) => {
      calls.push({ token, payload });
      if (failure) throw failure;
    },
  };
}
async function change() {
  const turn = (await getPersonalProgram(cookies[3])).campaigns[0].turns[0];
  return createChangeRequest(cookies[3], {
    turnId: turn.turnId,
    reasonCode: "other",
  });
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
});
beforeEach(async () => {
  ({ token, cookies } = await seedChangesFixture());
  // The reminder clock is October 29 regardless of the machine's date.
  // Keep synthetic device sessions valid at that injected instant too.
  const sessions = await db.collection("deviceSessions").get();
  const batch = db.batch();
  for (const session of sessions.docs)
    batch.update(session.ref, {
      expiresAt: Timestamp.fromMillis(
        Math.max(
          session.data().expiresAt.toMillis(),
          Date.parse("2026-11-02T00:00:00Z"),
        ),
      ),
    });
  await batch.commit();
});
after(async () => {
  await env.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});

test("v1: un aviso por persona asignada, incluso con varios turnos; ninguno a reservas", async () => {
  assert.equal(await count("program_published"), 7);
  assert.equal(await count("program_published", "person-6"), 1);
  assert.equal(await count("program_published", "person-7"), 0);
  const notifications = await rows("campaignNotifications"),
    outbox = await rows(notificationOutbox);
  assert.deepEqual(
    notifications.map((n) => n.id).sort(),
    outbox.map((n) => n.id).sort(),
  );
});
for (const action of ["accept", "reject"] as const)
  test(`PairRequest ${action}: B recibe solicitud, A respuesta, sin aviso a tercero`, async () => {
    await db
      .collection("campaigns")
      .doc(campaign)
      .update({ status: "registration_open" });
    for (const index of [8, 9]) {
      const id = registrationId(campaign, `person-${index}`);
      await db
        .collection("campaignRegistrations")
        .doc(id)
        .set({
          ...(
            await db.collection("campaignRegistrations").doc(reg(index)).get()
          ).data(),
          id,
        });
      await db
        .collection("availabilities")
        .doc(availabilityId(id, "block-0"))
        .set({
          campaignId: campaign,
          registrationId: id,
          timeBlockId: "block-0",
          available: true,
        });
    }
    const service = new PairRequestService(db, participantAuth());
    const pair = await service.mutate(cookies[8], campaign, {
      action: "create",
      recipientRegistrationId: registrationId(campaign, "person-9"),
    });
    assert.equal(await count("pair_request_created", "person-9"), 1);
    await service.mutate(cookies[9], campaign, { action, requestId: pair.id });
    assert.equal(
      await count(
        action === "accept" ? "pair_request_accepted" : "pair_request_rejected",
        "person-8",
      ),
      1,
    );
    assert.equal(await count("pair_request_created", "person-10"), 0);
    await assert.rejects(
      service.mutate(cookies[9], campaign, { action, requestId: pair.id }),
    );
    assert.equal(
      await count(
        action === "accept" ? "pair_request_accepted" : "pair_request_rejected",
        "person-8",
      ),
      1,
    );
  });
test("F8: resolución conserva avisos y solo afectados; v2 no repite publicación general", async () => {
  const r = await change();
  await decideChange(token, campaign, r.id, "approve", {});
  assert.equal(await count("change_request_approved", "person-3"), 1);
  const detail = await adminChanges(token, campaign, r.id);
  await resolveChange(token, campaign, r.id, {
    expectedProgramVersion: detail.expectedProgramVersion,
    currentProgramVersionId: detail.currentProgramVersionId,
    expectedRevision: detail.expectedRevision,
    replacementRegistrationId: reg(7),
    confirmWarnings: true,
    confirmUnit: true,
  });
  assert.equal(await count("program_published"), 7);
  assert.equal(await count("change_request_resolved", "person-3"), 1);
  for (const p of [3, 4, 7])
    assert.equal(await count("assignment_changed", `person-${p}`), 1);
  assert.equal(await count("assignment_changed", "person-0"), 0);
});
test("Historial privado, no leídos primero; DTO sin identidad, token, metadata ni secretos", async () => {
  const a = await event("old");
  const b = await event("new");
  await markNotificationsRead(cookies[7], { action: "one", id: b });
  const page = await notificationsPage(cookies[7]);
  assert.deepEqual(
    page.notifications.map((n) => n.id),
    [a, b],
  );
  assert.equal(page.unreadCount, 1);
  assert.equal((await notificationsPage(cookies[8])).notifications.length, 0);
  assert.doesNotMatch(
    JSON.stringify(page),
    /participantId|sessionRef|pinHash|fcmToken|registrationId|metadata|resolvedBy/,
  );
});
test("Marcar uno es idempotente; marcar todos conserva históricos y no afecta a otro", async () => {
  const a = await event("a"),
    b = await event("b");
  await event("c", 8);
  assert.equal(
    (await markNotificationsRead(cookies[7], { action: "one", id: a })).updated,
    1,
  );
  assert.equal(
    (await markNotificationsRead(cookies[7], { action: "one", id: a })).updated,
    0,
  );
  assert.equal(
    (await markNotificationsRead(cookies[7], { action: "all" })).updated,
    1,
  );
  assert.equal((await notificationsPage(cookies[7])).unreadCount, 0);
  assert.equal((await notificationsPage(cookies[8])).unreadCount, 1);
  assert.ok((await db.collection("campaignNotifications").doc(b).get()).exists);
});
test("No se puede leer o marcar aviso ajeno ni suplantar participante", async () => {
  const id = await event();
  await assert.rejects(
    markNotificationsRead(cookies[8], { action: "one", id }),
    denied(404),
  );
  await assert.rejects(
    markNotificationsRead(cookies[7], {
      action: "all",
      participantId: "person-8",
    }),
    denied(400),
  );
  await assert.rejects(
    notificationsPage(cookies[8], { participantId: "person-7" }),
    denied(400),
  );
  await assert.rejects(notificationsPage("no-session"), denied(401));
});
test("Paginación acotada 25/50 con cursor propio, sin perder ni duplicar históricos", async () => {
  for (let i = 0; i < 29; i++) await event("page" + i);
  const page = await notificationsPage(cookies[7]);
  assert.equal(page.notifications.length, 25);
  assert.ok(page.nextCursor);
  const next = await notificationsPage(cookies[7], { cursor: page.nextCursor });
  assert.equal(next.notifications.length, 4);
  assert.equal(next.nextCursor, null);
  assert.equal(
    new Set([...page.notifications, ...next.notifications].map((n) => n.id))
      .size,
    29,
  );
  await assert.rejects(
    notificationsPage(cookies[7], { limit: 51 }),
    denied(400),
  );
  await assert.rejects(
    notificationsPage(cookies[8], { cursor: page.nextCursor }),
    denied(400),
  );
});
test("Evento interno y outbox atómicos, ID determinístico no duplica en carrera", async () => {
  const results = await Promise.allSettled([event("race"), event("race")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await count("assignment_changed", "person-7"), 1);
  assert.ok(
    (
      await db
        .collection(notificationOutbox)
        .doc(notificationEventId("race", "assignment_changed", "person-7"))
        .get()
    ).exists,
  );
});
test("Suscripción deduplicada y status no expone token", async () => {
  const input = { fcmToken: fakeToken("one"), platform: "android" };
  await subscribePush(cookies[7], input);
  await subscribePush(cookies[7], input);
  assert.equal((await rows("pushSubscriptions")).length, 1);
  assert.deepEqual(await pushStatus(cookies[7]), { enabled: true });
  assert.deepEqual(await pushStatus(cookies[8]), { enabled: false });
});
test("Rotación desactiva token anterior de dispositivo, sin duplicar envío del mismo evento", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("old") });
  const id = await event();
  const fake = sender();
  await dispatchPushOutbox({ sender: fake });
  await subscribePush(cookies[7], { fcmToken: fakeToken("new") });
  assert.equal(
    (await rows("pushSubscriptions")).filter((r: any) => r.enabled).length,
    1,
  );
  await db
    .collection(notificationOutbox)
    .doc(id)
    .update({ status: "pending", nextAttemptAt: Timestamp.now() });
  await dispatchPushOutbox({ sender: fake });
  assert.equal(fake.calls.length, 1);
});
test("Dos dispositivos activos reciben el evento, desactivar uno no desconecta ni afecta al otro", async () => {
  const second = await secondDevice();
  await subscribePush(cookies[7], { fcmToken: fakeToken("first") });
  await subscribePush(second, { fcmToken: fakeToken("second") });
  await event();
  const fake = sender();
  await dispatchPushOutbox({ sender: fake });
  assert.equal(fake.calls.length, 2);
  await unsubscribePush(cookies[7], {});
  assert.deepEqual(await pushStatus(cookies[7]), { enabled: false });
  assert.deepEqual(await pushStatus(second), { enabled: true });
  assert.ok(await participantAuth().current(cookies[7]));
  await event("later");
  await dispatchPushOutbox({ sender: fake });
  assert.equal(fake.calls.length, 3);
  assert.equal(fake.calls[2].token, fakeToken("second"));
});
for (const key of ["participantId", "sessionRef", "id", "enabled"])
  test(`Suscripción strict rechaza ${key} del navegador`, async () => {
    await assert.rejects(
      subscribePush(cookies[7], {
        fcmToken: fakeToken("inject"),
        [key]: "bad",
      }),
      denied(400),
    );
  });
test("Desuscripción strict, sesión revocada no puede reactivar token", async () => {
  await assert.rejects(
    unsubscribePush(cookies[7], { participantId: "person-8" }),
    denied(400),
  );
  await db
    .collection("deviceSessions")
    .doc(tokenHash(cookies[7]))
    .update({ revokedAt: Timestamp.now() });
  await assert.rejects(
    subscribePush(cookies[7], { fcmToken: fakeToken("bad") }),
    denied(401),
  );
});
test("Token único no cambia dueño con sesión ajena vigente; logout permite nueva identidad", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("shared") });
  await assert.rejects(
    subscribePush(cookies[8], { fcmToken: fakeToken("shared") }),
    denied(409),
  );
  await participantAuth().logout(cookies[7]);
  assert.ok((await rows("pushSubscriptions")).every((r: any) => !r.enabled));
  await subscribePush(cookies[8], { fcmToken: fakeToken("shared") });
  assert.equal((await rows("pushSubscriptions"))[0].participantId, "person-8");
});
test("Cambio PIN/sessionVersion impide push a identidad antigua", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("old-session") });
  await event();
  await db
    .collection("participants")
    .doc("person-7")
    .update({ sessionVersion: 1 });
  const fake = sender();
  await dispatchPushOutbox({ sender: fake });
  assert.equal(fake.calls.length, 0);
  assert.ok((await rows("pushSubscriptions")).every((r: any) => !r.enabled));
  await subscribePush(cookies[8], { fcmToken: fakeToken("old-session") });
});
for (const state of ["expired", "revoked", "inactive"])
  test(`No enviar a sesión/perfil ${state}`, async () => {
    await subscribePush(cookies[7], { fcmToken: fakeToken(state) });
    await event();
    if (state === "inactive")
      await db
        .collection("participants")
        .doc("person-7")
        .update({ active: false });
    else
      await db
        .collection("deviceSessions")
        .doc(tokenHash(cookies[7]))
        .update(
          state === "expired"
            ? { expiresAt: Timestamp.fromMillis(1) }
            : { revokedAt: Timestamp.now() },
        );
    const fake = sender();
    await dispatchPushOutbox({ sender: fake });
    assert.equal(fake.calls.length, 0);
  });
test("Push genérico: no comentario ni nombres; destino interno seguro", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("privacy") });
  const id = await event();
  await db
    .collection("campaignNotifications")
    .doc(id)
    .update({ targetRoute: "https://evil.example/" });
  const fake = sender();
  await dispatchPushOutbox({ sender: fake });
  assert.equal(fake.calls.length, 1);
  assert.doesNotMatch(
    JSON.stringify(fake.calls[0].payload),
    /Comentario|Juan|Ana|phone|pinHash|participantId|sessionRef|FAKE/,
  );
  assert.equal(fake.calls[0].payload.targetRoute, "/campanas/avisos");
});
test("Dos dispatchers concurrentes no envían dos veces al dispositivo", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("concurrent") });
  await event();
  const fake = sender();
  await Promise.all([
    dispatchPushOutbox({ sender: fake }),
    dispatchPushOutbox({ sender: fake }),
  ]);
  assert.equal(fake.calls.length, 1);
  assert.equal((await rows(pushDeliveries)).length, 1);
});
test("Token FCM inválido se desactiva; historial permanece y no se reintenta", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("invalid") });
  const id = await event();
  const fake = sender({
    code: "messaging/registration-token-not-registered",
    message: "SECRET_TOKEN",
  });
  await dispatchPushOutbox({ sender: fake });
  await dispatchPushOutbox({
    sender: fake,
    now: new Date(Date.now() + 120000),
  });
  assert.equal(fake.calls.length, 1);
  assert.deepEqual(await pushStatus(cookies[7]), { enabled: false });
  assert.ok(
    (await db.collection("campaignNotifications").doc(id).get()).exists,
  );
  assert.doesNotMatch(
    JSON.stringify(await rows(pushDeliveries)),
    /SECRET_TOKEN|FAKE_LOCAL/,
  );
});
test("Fallo transitorio usa backoff y máximo cinco intentos, sin borrar aviso", async () => {
  await subscribePush(cookies[7], { fcmToken: fakeToken("retry") });
  const id = await event();
  const fake = sender(new Error("SECRET_TOKEN"));
  const now = Date.now();
  await dispatchPushOutbox({ sender: fake, now: new Date(now) });
  await dispatchPushOutbox({ sender: fake, now: new Date(now + 1000) });
  assert.equal(fake.calls.length, 1);
  for (let i = 1; i <= 6; i++)
    await dispatchPushOutbox({
      sender: fake,
      now: new Date(now + i * 3600000),
    });
  assert.equal(fake.calls.length, maximumPushAttempts);
  assert.equal((await rows(pushDeliveries))[0].status, "failed");
  assert.ok(
    (await db.collection("campaignNotifications").doc(id).get()).exists,
  );
  assert.doesNotMatch(
    JSON.stringify(await rows(pushDeliveries)),
    /SECRET_TOKEN/,
  );
});
test("Fallo FCM no revierte aprobación ni publicación", async () => {
  await subscribePush(cookies[3], { fcmToken: fakeToken("fail") });
  const r = await change();
  await decideChange(token, campaign, r.id, "approve", {});
  await dispatchPushOutbox({ sender: sender(new Error("no service account")) });
  assert.equal(
    (await db.collection("changeRequests").doc(r.id).get()).data()?.status,
    "approved",
  );
  assert.equal(
    (await db.collection("campaigns").doc(campaign).get()).data()
      ?.programVersion,
    1,
  );
});
test("Recordatorio día anterior: reloj inyectado, Chile IANA, evento único por turno/persona", async () => {
  const now = new Date("2026-10-29T11:00:00Z");
  const result = await dispatchTurnReminders(now, { sender: sender() });
  assert.equal(result.created, 6);
  assert.equal(
    (await dispatchTurnReminders(now, { sender: sender() })).created,
    0,
  );
  assert.equal(await count("turn_reminder"), 6);
  assert.equal(await count("turn_reminder", "person-10"), 0);
});
test("Recordatorios concurrentes idempotentes", async () => {
  const now = new Date("2026-10-29T11:00:00Z");
  const results = await Promise.all([
    dispatchTurnReminders(now, { sender: sender() }),
    dispatchTurnReminders(now, { sender: sender() }),
  ]);
  assert.equal(
    results.reduce((n, r) => n + r.created, 0),
    6,
  );
  assert.equal(await count("turn_reminder"), 6);
});
test("Fuera de ventana, draft, cancelled y perfil inactive no generan recordatorio", async () => {
  assert.equal(
    (
      await dispatchTurnReminders(new Date("2026-10-30T11:00:00Z"), {
        sender: sender(),
      })
    ).created,
    0,
  );
  await db
    .collection("campaignAssignments")
    .doc("ordinary-a")
    .update({ status: "cancelled" });
  await db.collection("participants").doc("person-4").update({ active: false });
  await db
    .collection("campaignAssignments")
    .doc("incomplete")
    .update({ status: "draft" });
  assert.equal(
    (
      await dispatchTurnReminders(new Date("2026-10-29T11:00:00Z"), {
        sender: sender(),
      })
    ).created,
    3,
  );
});
test("v2: cancela recordatorio histórico y recuerda solo asignación actual, sin duplicar intactos", async () => {
  const now = new Date("2026-10-29T11:00:00Z");
  await dispatchTurnReminders(now, { sender: sender() });
  const r = await change();
  await decideChange(token, campaign, r.id, "approve", {});
  const d = await adminChanges(token, campaign, r.id);
  await resolveChange(token, campaign, r.id, {
    expectedProgramVersion: d.expectedProgramVersion,
    currentProgramVersionId: d.currentProgramVersionId,
    expectedRevision: d.expectedRevision,
    replacementRegistrationId: reg(7),
    confirmWarnings: true,
    confirmUnit: true,
  });
  assert.equal(
    (await dispatchTurnReminders(now, { sender: sender() })).created,
    1,
  );
  assert.equal(await count("turn_reminder", "person-7"), 1);
  assert.equal(await count("turn_reminder", "person-4"), 1);
});
test("Recordatorio pendiente no se entrega tras cancelación del turno", async () => {
  await subscribePush(cookies[3], {
    fcmToken: fakeToken("cancelled-reminder"),
  });
  const now = new Date("2026-10-29T11:00:00Z"),
    fake = sender({ code: "messaging/server-unavailable" });
  await dispatchTurnReminders(now, { sender: fake });
  await db
    .collection("campaignAssignments")
    .doc("ordinary-a")
    .update({ status: "cancelled" });
  const delivered = sender();
  await dispatchPushOutbox({
    sender: delivered,
    now: new Date(now.getTime() + 3600000),
  });
  assert.ok(delivered.calls.every((c) => c.payload.type !== "turn_reminder"));
});
test("Zona configurable y DST: no parsear fecha local como UTC; rechazar horas imposibles", () => {
  assert.equal(
    campaignTurnInstant(
      "2026-10-30",
      "08:00",
      "America/Santiago",
    ).toISOString(),
    "2026-10-30T11:00:00.000Z",
  );
  assert.equal(
    campaignTurnInstant(
      "2026-06-30",
      "08:00",
      "America/Santiago",
    ).toISOString(),
    "2026-06-30T12:00:00.000Z",
  );
  assert.equal(
    campaignTurnInstant("2026-10-30", "08:00", "UTC").toISOString(),
    "2026-10-30T08:00:00.000Z",
  );
  assert.throws(() =>
    campaignTurnInstant("2026-09-06", "00:30", "America/Santiago"),
  );
  assert.throws(() =>
    campaignTurnInstant("2026-04-04", "23:30", "America/Santiago"),
  );
});
test("Campaña no published jamás genera recordatorios", async () => {
  await db.collection("campaigns").doc(campaign).update({ status: "planning" });
  assert.equal(
    (
      await dispatchTurnReminders(new Date("2026-10-29T11:00:00Z"), {
        sender: sender(),
      })
    ).created,
    0,
  );
});
test("Endpoints privados/no-store, cookies HttpOnly derivan ownership y CSRF rechaza origen ajeno", async () => {
  const id = await event();
  const response = await noticesGET(
    request("/api/campanas/participant/notifications"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(
    (await noticesGET(request("/api/campanas/participant/notifications", "")))
      .status,
    401,
  );
  assert.equal(
    (
      await eventGET(
        request(
          `/api/campanas/participant/notifications/push-event?id=${id}`,
          cookies[8],
        ),
      )
    ).status,
    404,
  );
  const own = await eventGET(
    request(`/api/campanas/participant/notifications/push-event?id=${id}`),
  );
  assert.deepEqual(Object.keys(await own.json()).sort(), [
    "targetRoute",
    "type",
  ]);
  assert.equal(
    (
      await readPOST(
        request(
          "/api/campanas/participant/notifications/read",
          cookies[7],
          { action: "all" },
          "https://evil.example",
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await subscribePOST(
        request(
          "/api/campanas/participant/push/subscribe",
          cookies[7],
          { fcmToken: fakeToken("csrf") },
          "https://evil.example",
        ),
      )
    ).status,
    403,
  );
});
test("Job sin configurar 503, secreto inválido 401, strict body y clock no inyectable", async () => {
  delete process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET;
  const req = (body: string, secret = "secret") =>
    new NextRequest("http://localhost/api/internal/campanas/turn-reminders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body,
    });
  assert.equal((await jobPOST(req("{}"))).status, 503);
  process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET =
    "ONLY_LOCAL_TEST_SECRET_0123456789012345";
  assert.equal((await jobPOST(req("{}"))).status, 401);
  assert.equal(
    (
      await jobPOST(
        req("not-json", process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await jobPOST(
        req(
          '{"now":"2026-10-29"}',
          process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET,
        ),
      )
    ).status,
    400,
  );
  delete process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET;
});
for (const collection of [
  "campaignNotifications",
  "pushSubscriptions",
  "campaignNotificationOutbox",
  "campaignPushDeliveries",
  "campaignNotificationJobLocks",
  "campaignProgramVersions",
  "campaignAssignments",
  "changeRequests",
])
  test(`Rules cierran ${collection}, incluso usuario Firebase campaign_admin`, async () => {
    const client = env
      .authenticatedContext("browser-admin", { campaign_admin: true })
      .firestore();
    await assertFails(getDoc(doc(client, collection, "private")));
    await assertFails(
      setDoc(doc(client, collection, "private"), { participantId: "person-7" }),
    );
  });
test("Targets no aceptan URL externa, traversal, JS o ruta ajena a Campañas", () => {
  for (const route of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "/campanas/../admin",
    "/territorios",
  ])
    assert.equal(safeNotificationRoute(route), "/campanas/avisos");
  assert.equal(
    safeNotificationRoute("/campanas/mi-programa"),
    "/campanas/mi-programa",
  );
});
test("Manifest real y PNG locales 192/512/maskable; offline sin información privada", async () => {
  const manifest = JSON.parse(
    await readFile("public/campanas.webmanifest", "utf8"),
  );
  assert.equal(manifest.start_url, "/campanas");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const png = await readFile("public" + icon.src);
    assert.equal(png.readUInt32BE(16), Number(icon.sizes.split("x")[0]));
    assert.equal(png.readUInt32BE(20), Number(icon.sizes.split("x")[1]));
  }
  assert.ok(manifest.icons.some((i: any) => i.purpose === "maskable"));
  const html = await readFile("public/campanas-offline.html", "utf8");
  assert.match(
    html,
    /Necesitas conexión para actualizar información de la campaña/,
  );
  assert.doesNotMatch(html, /participantId|fcmToken|Juan|registrationId/);
});
test("Worker único, NetworkOnly privado; actualización manual y ningún permiso push al cargar", async () => {
  const config = await readFile("next.config.ts", "utf8"),
    worker = await readFile("worker/index.js", "utf8"),
    ui = await readFile(
      "src/modules/campaigns/components/campaign-pwa.tsx",
      "utf8",
    );
  assert.match(config, /skipWaiting: false/);
  assert.match(config, /cacheStartUrl: false/);
  assert.match(config, /dynamicStartUrl: false/);
  assert.match(config, /NetworkOnly/);
  assert.match(ui, /window.confirm/);
  assert.match(ui, /SKIP_WAITING/);
  assert.match(ui, /isInstallDismissed/);
  assert.match(ui, /beforeinstallprompt/);
  assert.match(ui, /Compartir/);
  assert.match(worker, /ownEvent/);
  assert.match(worker, /credentials: "same-origin"/);
  assert.match(worker, /CAMPAIGNS_LOGOUT/);
  assert.match(worker, /CAMPAIGNS_SESSION_CLEARED/);
  assert.match(ui, /BroadcastChannel/);
  assert.match(ui, /CAMPAIGNS_SESSION_CLEARED/);
  assert.doesNotMatch(worker, /importScripts\("https:/);
  const push = await readFile(
    "src/modules/campaigns/components/push-settings.tsx",
    "utf8",
  );
  assert.equal((push.match(/Notification.requestPermission/g) ?? []).length, 1);
  assert.ok(
    push.indexOf("Notification.requestPermission") >
      push.indexOf("async function toggle"),
  );
});

test("Rechazo F8 conserva aviso/outbox y no modifica programa", async () => {
  const r = await change();
  await decideChange(token, campaign, r.id, "reject", {});
  const id = notificationEventId(r.id, "change_request_rejected", "person-3");
  assert.equal(await count("change_request_rejected", "person-3"), 1);
  assert.ok((await db.collection(notificationOutbox).doc(id).get()).exists);
  assert.equal(
    (await db.collection("campaigns").doc(campaign).get()).data()
      ?.programVersion,
    1,
  );
});

test("Carrera de token compartido entre dos identidades: solo una suscripción gana", async () => {
  const results = await Promise.allSettled([
    subscribePush(cookies[7], { fcmToken: fakeToken("ownership-race") }),
    subscribePush(cookies[8], { fcmToken: fakeToken("ownership-race") }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await rows("pushSubscriptions")).length, 1);
  const failure = results.find((r) => r.status === "rejected");
  assert.ok(failure?.status === "rejected" && denied(409)(failure.reason));
});

test("Reintento parcial no reenvía al dispositivo que ya confirmó entrega", async () => {
  const second = await secondDevice();
  await subscribePush(cookies[7], { fcmToken: fakeToken("success") });
  await subscribePush(second, { fcmToken: fakeToken("transient") });
  await event();
  const calls: string[] = [];
  let failing = true;
  const fake: PushDeliveryService = {
    send: async (token) => {
      calls.push(token);
      if (token === fakeToken("transient") && failing)
        throw { code: "messaging/server-unavailable" };
    },
  };
  const now = Date.now();
  await dispatchPushOutbox({ sender: fake, now: new Date(now) });
  failing = false;
  await dispatchPushOutbox({ sender: fake, now: new Date(now + 120000) });
  assert.equal(calls.filter((t) => t === fakeToken("success")).length, 1);
  assert.equal(calls.filter((t) => t === fakeToken("transient")).length, 2);
});

test("Reminder multidispositivo es una Notification lógica y dos entregas", async () => {
  const second = await secondDevice(3);
  await db
    .collection("deviceSessions")
    .doc(tokenHash(second))
    .update({
      expiresAt: Timestamp.fromMillis(
        Math.max(
          Date.now() + SESSION_SECONDS * 1000,
          Date.parse("2026-11-02T00:00:00Z"),
        ),
      ),
    });
  await subscribePush(cookies[3], { fcmToken: fakeToken("reminder-one") });
  await subscribePush(second, { fcmToken: fakeToken("reminder-two") });
  const fake = sender();
  await dispatchTurnReminders(new Date("2026-10-29T11:00:00Z"), {
    sender: fake,
  });
  assert.equal(await count("turn_reminder", "person-3"), 1);
  assert.equal(
    fake.calls.filter((c) => c.payload.type === "turn_reminder").length,
    2,
  );
});

test("Job correcto funciona y limita ejecuciones simultáneas; participante sin secreto no accede", async () => {
  const secret = "ONLY_LOCAL_TEST_SECRET_0123456789012345";
  process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET = secret;
  try {
    const req = () =>
      new NextRequest("http://localhost/api/internal/campanas/turn-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    assert.equal(
      (
        await jobPOST(
          request("/api/internal/campanas/turn-reminders", cookies[7], {}),
        )
      ).status,
      401,
    );
    assert.equal((await jobPOST(req())).status, 200);
    assert.equal((await jobPOST(req())).status, 429);
  } finally {
    delete process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET;
  }
});
