import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadPlannerDay, PlannerHttpError, plannerViewAfterFailure } from "../../src/modules/campaigns/lib/planner-day-client";
import type { PlannerDayView } from "../../src/modules/campaigns/domain/planner";

const day = { campaign: { id: "campaign-a" }, days: [{ id: "a", date: "2026-10-31" }], blocks: Array.from({ length: 6 }, (_, i) => ({ block: { id: `b${i}` } })) } as PlannerDayView;
test("Six blocks arrive through one authenticated request, including initial default day", async () => {
  let calls = 0;
  const result = await loadPlannerDay(async (url, init) => {
    calls++; assert.equal(url, "/api/test/planner?dayId=");
    assert.deepEqual(init?.headers, { Authorization: "Bearer valid" });
    assert.equal(init?.cache, "no-store"); return Response.json(day);
  }, "/api/test", "valid", "", new AbortController().signal);
  assert.equal(calls, 1); assert.equal(result.blocks.length, 6);
});
test("Day change performs one request for the requested day", async () => {
  let calls = 0;
  await loadPlannerDay(async (url) => { calls++; assert.equal(url, "/api/test/planner?dayId=day%202"); return Response.json(day); }, "/api/test", "valid", "day 2", new AbortController().signal);
  assert.equal(calls, 1);
});
for (const status of [401, 403, 404, 409, 500]) test(`HTTP ${status} handled even for non-JSON; security errors clear data`, async () => {
  let failure: unknown;
  try { await loadPlannerDay(async () => new Response("<html>error</html>", { status }), "/api/test", "valid", "a", new AbortController().signal); }
  catch (error) { failure = error; }
  assert.ok(failure instanceof PlannerHttpError); assert.equal(failure.status, status);
  assert.equal(plannerViewAfterFailure(day, failure), [401, 403].includes(status) ? null : day);
  assert.equal(plannerViewAfterFailure(null, failure), null);
});
test("Network failure and malformed success retain last valid snapshot", async () => {
  for (const fetcher of [async () => { throw new Error("network"); }, async () => new Response("invalid"), async () => Response.json({ blocks: [] })]) {
    await assert.rejects(() => loadPlannerDay(fetcher, "/api/test", "valid", "a", new AbortController().signal), (failure) => { assert.equal(plannerViewAfterFailure(day, failure), day); return true; });
  }
});
test("Component has first-load, error/retry and empty-day states; mutation refreshes once", () => {
  const source = readFileSync("src/modules/campaigns/components/campaign-planner.tsx", "utf8");
  assert.doesNotMatch(source, /Promise\.all|getIdToken\(true\)|fetchView|setDayViews/);
  assert.match(source, /Cargando planificación del día/);
  assert.match(source, /Seguimos mostrando la última planificación cargada/);
  assert.match(source, /Reintentar<\/button>/);
  assert.match(source, /Este día todavía no tiene bloques activos/);
  const write = source.slice(source.indexOf("async function write"), source.indexOf("async function activate"));
  assert.equal((write.match(/await refresh\(\)/g) ?? []).length, 1);
  const service = readFileSync("src/modules/campaigns/server/planner-service.ts", "utf8");
  const daily = service.slice(service.indexOf("export async function getPlannerDay"), service.indexOf("export class PlannerWarnings"));
  assert.equal((daily.match(/readPlannerSource\(/g) ?? []).length, 1);
  assert.match(daily, /readOnly: true/);
  assert.match(daily, /plannerAccess\(token, campaignId\)/);
});
