import assert from "node:assert/strict";
import test from "node:test";
import { usesParticipantStartup } from "../../src/modules/campaigns/lib/startup";
import { essentialCampaignPrecache } from "../../src/modules/campaigns/lib/pwa-precache.mjs";
import { checkCampaignRegistration, monitorCampaignUpdates } from "../../src/modules/campaigns/lib/pwa-update-monitor";

class Worker extends EventTarget { state = "installed"; }
class Container extends EventTarget { controller: Worker | null = new Worker(); }
class Registration extends EventTarget {
  active: Worker | null = new Worker(); waiting: Worker | null = null; installing: Worker | null = null;
  calls = 0;
  async update() { this.calls++; }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function watch(registration: Registration, container = new Container(), intervalMs = 60_000) {
  const windowEvents = new EventTarget(), documentEvents = new EventTarget();
  const found: Worker[] = [];
  const state = { visible: true, online: true };
  const stop = monitorCampaignUpdates(registration, container, {
    onReady: (worker) => found.push(worker), isVisible: () => state.visible, isOnline: () => state.online,
    windowEvents, documentEvents, minimumCheckIntervalMs: 0, intervalMs,
  });
  return { found, stop, state, windowEvents, documentEvents };
}

test("entrada participante evita Firebase Auth del panel; administración conserva su proveedor", () => {
  for (const path of ["/unirse", "/campanas", "/campanas/registro", "/campanas/ingresar", "/campanas/organizacion/a", "/campanas/disponibilidad/a"])
    assert.equal(usesParticipantStartup(path), true);
  for (const path of ["/", "/usuarios", "/campanas/admin", "/campanas/admin/participantes/a"])
    assert.equal(usesParticipantStartup(path), false);
});
test("precache instala sólo el fallback anónimo y el icono pequeño", () => {
  const entries = ["/campanas-offline.html", "/campanas-icon-192.png", "/campanas-icon-source.png", "/_next/static/chunks/app/usuarios/page.js", "/campanas", "/api/campanas/auth/session"].map((url) => ({ url, revision: "test" }));
  assert.deepEqual(essentialCampaignPrecache(entries).manifest.map((row) => row.url), ["/campanas-offline.html", "/campanas-icon-192.png"]);
});
test("versión ya esperando se anuncia al abrir y no repite el modal en cada comprobación", async () => {
  const registration = new Registration(); registration.waiting = new Worker();
  const w = watch(registration);
  try {
    await settle(); w.windowEvents.dispatchEvent(new Event("focus")); await settle();
    assert.deepEqual(w.found, [registration.waiting]);
    assert.equal(registration.calls, 2);
  } finally { w.stop(); }
});
test("una versión instalada después de reabrir la PWA se anuncia automáticamente", async () => {
  const registration = new Registration(), w = watch(registration);
  try {
    await settle();
    const worker = new Worker(); worker.state = "installing"; registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    assert.equal(w.found.length, 0);
    registration.waiting = worker; registration.installing = null; worker.state = "installed";
    worker.dispatchEvent(new Event("statechange"));
    assert.deepEqual(w.found, [worker]);
  } finally { w.stop(); }
});
test("primera instalación no muestra actualización; una versión posterior sí", async () => {
  const registration = new Registration(), container = new Container();
  registration.active = null; container.controller = null;
  const w = watch(registration, container);
  try {
    await settle();
    const initial = new Worker(); initial.state = "activated";
    registration.active = initial; container.controller = initial;
    container.dispatchEvent(new Event("controllerchange"));
    assert.equal(w.found.length, 0);
    registration.waiting = new Worker();
    w.windowEvents.dispatchEvent(new Event("focus")); await settle();
    assert.deepEqual(w.found, [registration.waiting]);
  } finally { w.stop(); }
});
test("retorno al primer plano, reconexión y comprobación periódica detectan versiones", async () => {
  const registration = new Registration(), w = watch(registration, new Container(), 10);
  try {
    await settle();
    w.state.visible = false; const calls = registration.calls;
    w.documentEvents.dispatchEvent(new Event("visibilitychange")); await settle();
    assert.equal(registration.calls, calls);
    w.state.visible = true; w.documentEvents.dispatchEvent(new Event("visibilitychange")); await settle();
    assert.ok(registration.calls > calls);
    w.state.online = false; const offlineCalls = registration.calls;
    w.windowEvents.dispatchEvent(new Event("focus")); await settle();
    assert.equal(registration.calls, offlineCalls);
    w.state.online = true; w.windowEvents.dispatchEvent(new Event("online")); await settle();
    assert.ok(registration.calls > offlineCalls);
    registration.waiting = new Worker(); await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(w.found, [registration.waiting]);
  } finally { w.stop(); }
});
test("otra pestaña puede activar la actualización sin perder el aviso en la actual", async () => {
  const registration = new Registration(), container = new Container(), w = watch(registration, container);
  try {
    await settle(); container.controller = new Worker(); container.controller.state = "activated";
    container.dispatchEvent(new Event("controllerchange"));
    assert.deepEqual(w.found, [container.controller]);
  } finally { w.stop(); }
});
test("comprobación manual distingue descarga en curso y tiene timeout", async () => {
  const registration = new Registration(); registration.installing = new Worker();
  assert.equal(await checkCampaignRegistration(registration), "installing");
  registration.update = () => new Promise(() => {});
  await assert.rejects(checkCampaignRegistration(registration, 1), /update-timeout/);
});
test("cerrar el monitor limpia eventos y evita anuncios tardíos", async () => {
  const registration = new Registration(), w = watch(registration);
  w.stop(); await settle(); registration.waiting = new Worker();
  const calls = registration.calls;
  w.windowEvents.dispatchEvent(new Event("focus")); registration.dispatchEvent(new Event("updatefound"));
  assert.equal(registration.calls, calls); assert.equal(w.found.length, 0);
});
