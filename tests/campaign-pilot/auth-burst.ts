import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { NextRequest } from "next/server";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";

export function assertPilotEmulators() {
  assert.equal(process.env.FIREBASE_ADMIN_PROJECT_ID, "demo-campaign-auth");
  for (const key of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"])
    assert.match(process.env[key] ?? "", /^(localhost|127\.0\.0\.1):\d+$/);
}
export async function clearPilot() {
  assertPilotEmulators();
  const result = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-campaign-auth/databases/(default)/documents`,
    { method: "DELETE" },
  );
  assert.equal(result.status, 200);
}
export const pilotOrigin = "http://localhost:3000";
export const pilotSecret = "Synthetic-Pilot-Only-01234567890123456789";
export const pilotPin = "638251";
export const pilotPhone = (index: number) => `+569${50000000 + index}`;
export function configurePilot() {
  assertPilotEmulators();
  process.env.CAMPAIGNS_AUTH_SECRET = pilotSecret;
  process.env.CAMPAIGNS_APP_ORIGIN = pilotOrigin;
}
export async function invokeAuth(action: string, body: unknown, cookie = "") {
  const { POST } = await import(
    "../../src/app/api/campanas/auth/[action]/route"
  );
  return POST(
    new NextRequest(`${pilotOrigin}/api/campanas/auth/${action}`, {
      method: "POST",
      headers: {
        origin: pilotOrigin,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ action }) },
  );
}
/** Small batches, not a load attack. Uses actual HTTP handlers and bcrypt cost 12. */
export async function burst(
  count: number,
  operation: (index: number) => Promise<Response>,
  concurrency = 4,
) {
  const latencies: number[] = [],
    statuses: Record<string, number> = {};
  const started = performance.now();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < count) {
        const index = cursor++,
          start = performance.now();
        const response = await operation(index);
        await response.arrayBuffer();
        latencies.push(performance.now() - start);
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
      }
    }),
  );
  latencies.sort((a, b) => a - b);
  return {
    count,
    concurrency,
    statuses,
    p50Ms: Math.round(latencies[Math.floor((latencies.length - 1) * 0.5)]),
    p95Ms: Math.round(latencies[Math.floor((latencies.length - 1) * 0.95)]),
    maxMs: Math.round(latencies.at(-1)!),
    durationMs: Math.round(performance.now() - started),
  };
}
export async function registrationBurst(count: number, offset = 0) {
  return burst(count, (index) =>
    invokeAuth("register", {
      fullName: `Participante ficticio piloto ${offset + index}`,
      phone: pilotPhone(offset + index),
      pin: pilotPin,
      confirmPin: pilotPin,
    }),
  );
}
export async function clearAuthCounters() {
  const db = campaignsAdminDb();
  const rows = await db.collection("campaignAuthLimits").get(),
    batch = db.batch();
  rows.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
