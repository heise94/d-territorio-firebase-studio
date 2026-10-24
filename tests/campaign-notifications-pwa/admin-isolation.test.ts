import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { campaignWorkerScope, isLegacyCampaignWorker, migrateLegacyCampaignWorker, identifyCampaignWorker } from "../../src/modules/campaigns/lib/pwa-registration";

const read = (path: string) => readFileSync(path, "utf8");
test("Admin inherits a neutral layout without PWA or root manifest; its guard stays intact", () => {
  const neutral = read("src/app/campanas/layout.tsx");
  const admin = read("src/app/campanas/admin/layout.tsx");
  assert.match(neutral, /manifest: null/);
  for (const source of [neutral, admin]) assert.doesNotMatch(source, /CampaignPwa|CampaignUpdateFooter|beforeinstallprompt|SKIP_WAITING|appleWebApp|Nueva versión disponible|Actualizar ahora/);
  for (const permission of ["AdminGuard", "PermissionsProvider", "MANAGE_CAMPAIGNS"]) assert.ok(admin.includes(permission));
});
test("Participant route group preserves URLs, manifest and update flow, including Organization", () => {
  const path = "src/app/campanas/(participant)";
  const layout = read(`${path}/layout.tsx`);
  assert.match(layout, /<CampaignPwa>/);
  assert.match(layout, /manifest: "\/campanas.webmanifest"/);
  assert.match(layout, /appleWebApp/);
  const routes = readdirSync(path);
  assert.ok(routes.includes("page.tsx") && routes.includes("organizacion"));
  assert.ok(!routes.includes("admin"));
  const pwa = read("src/modules/campaigns/components/campaign-pwa.tsx");
  for (const feature of ["monitorCampaignUpdates", "beforeinstallprompt", "SKIP_WAITING", "Nueva versión disponible", "Actualizar ahora", "campaignWorkerScope"]) assert.ok(pwa.includes(feature));
  assert.doesNotMatch(pwa, /scope: "\/"/);
  assert.equal(campaignWorkerScope, "/campanas");
  const manifest = JSON.parse(read("public/campanas.webmanifest"));
  assert.ok(manifest.start_url.startsWith(campaignWorkerScope));
});
test("Admin NetworkOnly rule precedes participant fallback and covers HTML/RSC/API", () => {
  const config = read("next.config.mjs");
  const section = config.slice(config.indexOf("runtimeCaching:"));
  const matcher = section.match(/urlPattern: (\(\{ url \}\) =>[\s\S]*?),\n\s*handler: "NetworkOnly"/)!;
  assert.ok(matcher);
  const match = Function(`return (${matcher[1]})`)();
  for (const path of ["/campanas/admin", "/campanas/admin/planificacion/c?_rsc=abc", "/api/campanas/admin/campaigns/c/planner?dayId=d"]) assert.equal(match({ url: new URL(path, "https://example.test") }), true);
  assert.equal(match({ url: new URL("https://example.test/campanas/avisos") }), false);
  assert.ok(section.indexOf("handlerDidError") > section.indexOf('handler: "NetworkOnly"'));
  const firstRule = section.slice(0, section.indexOf("// Never cache participant"));
  assert.doesNotMatch(firstRule, /handlerDidError|caches\.match/);
});
test("Generated worker executes Admin NetworkOnly before all generic routes", () => {
  const routes: { match: any; handler: any }[] = [];
  class Strategy { constructor(public options: any = {}) {} }
  class NetworkOnly extends Strategy {}
  const workbox = new Proxy({ NetworkOnly, clientsClaim() {}, precacheAndRoute() {}, cleanupOutdatedCaches() {}, registerRoute(match: any, handler: any) { routes.push({ match, handler }); } } as any, { get(target, key) { return target[key] ?? Strategy; } });
  const define = (_deps: unknown, factory: any) => factory(workbox);
  runInNewContext(read("public/sw.js"), { self: { define, addEventListener() {} }, define, importScripts() {}, URL });
  const admin = routes[0];
  assert.ok(admin.handler instanceof NetworkOnly);
  assert.equal(admin.handler.options.plugins, undefined);
  for (const path of ["/campanas/admin", "/campanas/admin/planificacion/a?_rsc=x", "/api/campanas/admin/campaigns/a/planner?dayId=d"]) assert.ok(admin.match({ url: new URL(path, origin) }));
  assert.ok(routes[1].handler instanceof NetworkOnly);
  assert.equal(typeof routes[1].handler.options.plugins[0].handlerDidError, "function");
});
const origin = "https://example.test";
function registration(scope = `${origin}/`, scriptURL = `${origin}/sw.js`) {
  let removed = 0, updated = 0;
  const reg = { scope, active: { scriptURL }, waiting: null, installing: null,
    async update() { updated++; }, async unregister() { removed++; return true; } } as unknown as ServiceWorkerRegistration;
  return { reg, removed: () => removed, updated: () => updated };
}
test("Legacy migration never touches another scope, script or origin", async () => {
  for (const [scope, script] of [[`${origin}/other/`, `${origin}/sw.js`], [`${origin}/`, `${origin}/other.js`], ["https://other.test/", "https://other.test/sw.js"], [`${origin}/campanas`, `${origin}/sw.js`]]) {
    const fixture = registration(scope, script);
    assert.equal(isLegacyCampaignWorker(fixture.reg, origin), false);
    await migrateLegacyCampaignWorker({ getRegistration: async () => fixture.reg } as unknown as ServiceWorkerContainer, origin, async () => { throw new Error("must not probe"); });
    assert.equal(fixture.removed(), 0); assert.equal(fixture.updated(), 0);
  }
});
test("Exact legacy worker is unregistered only after explicit campaign identity", async () => {
  const fixture = registration();
  let probes = 0;
  const result = await migrateLegacyCampaignWorker({ getRegistration: async (url: string) => { assert.equal(url, `${origin}/`); return fixture.reg; } } as unknown as ServiceWorkerContainer, origin, async () => { probes++; return true; });
  assert.equal(result, true); assert.equal(probes, 1); assert.equal(fixture.updated(), 1); assert.equal(fixture.removed(), 1);
});
test("Same URL but unknown worker identity is never removed", async () => {
  const fixture = registration();
  await migrateLegacyCampaignWorker({ getRegistration: async () => fixture.reg } as unknown as ServiceWorkerContainer, origin, async () => false);
  assert.equal(fixture.removed(), 0);
});
test("Identity handshake rejects missing/wrong responses and accepts campaign marker", async () => {
  for (const application of ["unrelated", "campanas-exhibidores"]) {
    const worker = { postMessage(_: unknown, ports: MessagePort[]) { ports[0].postMessage({ type: "CAMPAIGNS_WORKER_IDENTITY", application }); } } as unknown as ServiceWorker;
    assert.equal(await identifyCampaignWorker(worker, 200), application === "campanas-exhibidores");
  }
  assert.equal(await identifyCampaignWorker({ postMessage() {} } as unknown as ServiceWorker, 10), false);
});
test("Opted-in push retains legacy registration until token rebind succeeds", () => {
  const pwa = read("src/modules/campaigns/components/campaign-pwa.tsx");
  assert.match(pwa, /legacy\?\.pushManager.getSubscription\(\)/);
  const push = read("src/modules/campaigns/components/push-settings.tsx");
  assert.ok(push.indexOf("migrateLegacyCampaignWorker(navigator") > push.indexOf("No pudimos actualizar las notificaciones"));
  assert.match(push, /campanas-worker-ready/);
});
