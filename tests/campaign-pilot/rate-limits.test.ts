import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { deleteApp } from "firebase-admin/app";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { globalAuthLimit } from "../../src/modules/campaigns/server/auth/rate-limits";
import {
  configurePilot,
  clearPilot,
  registrationBurst,
  clearAuthCounters,
  burst,
  invokeAuth,
  pilotPhone,
  pilotPin,
} from "./auth-burst";

before(configurePilot);
after(async () => {
  await clearPilot();
  await campaignsAdminDb().terminate();
  await deleteApp(campaignsAdminApp());
});
test("Límites globales configurables y finitos; configuración inválida falla cerrada", () => {
  for (const [action, key, expected] of [
    ["register", "CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT", 160],
    ["login", "CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT", 240],
  ] as const) {
    delete process.env[key];
    assert.equal(globalAuthLimit(action), expected);
    process.env[key] = "81";
    assert.equal(globalAuthLimit(action), 81);
    for (const invalid of [
      "",
      "0",
      "-1",
      "Infinity",
      "10001",
      "1.5",
      "81foo",
    ]) {
      process.env[key] = invalid;
      assert.throws(() => globalAuthLimit(action));
    }
    delete process.env[key];
  }
});
test("40 y 80 altas únicas: todas aceptadas sin 429 legítimos", async () => {
  for (const count of [40, 80]) {
    await clearPilot();
    const result = await registrationBurst(count);
    console.log(
      "PILOT_AUTH",
      JSON.stringify({ action: "register", ...result }),
    );
    assert.deepEqual(result.statuses, { 200: count });
    assert.equal(
      (await campaignsAdminDb().collection("participants").get()).size,
      count,
    );
  }
});
test("40/80 logins y 80+20 reintentos legítimos preservan identidad y sesiones", async () => {
  for (const count of [40, 80, 100]) {
    await clearAuthCounters();
    const result = await burst(count, (index) =>
      invokeAuth("login", { phone: pilotPhone(index % 80), pin: pilotPin }),
    );
    console.log("PILOT_AUTH", JSON.stringify({ action: "login", ...result }));
    assert.deepEqual(result.statuses, { 200: count });
  }
});
test("PIN incorrecto sigue limitado por teléfono: cinco 401, después 429", async () => {
  await clearAuthCounters();
  for (let index = 0; index < 5; index++)
    assert.equal(
      (await invokeAuth("login", { phone: pilotPhone(0), pin: "0000" })).status,
      401,
    );
  assert.equal(
    (await invokeAuth("login", { phone: pilotPhone(0), pin: pilotPin })).status,
    429,
  );
  assert.equal(
    (await invokeAuth("login", { phone: pilotPhone(1), pin: pilotPin })).status,
    200,
  );
});
test("El techo global sigue vigente y no se evade con identidades únicas", async () => {
  await clearAuthCounters();
  process.env.CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT = "2";
  try {
    const result = await registrationBurst(3, 1000);
    assert.deepEqual(result.statuses, { 200: 2, 429: 1 });
  } finally {
    delete process.env.CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT;
  }
});
