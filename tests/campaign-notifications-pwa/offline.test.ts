import assert from "node:assert/strict";
import { test } from "node:test";
import {
  campaignFetch,
  offlineMessage,
} from "../../src/modules/campaigns/lib/campaign-fetch";
import {
  isAppleMobile,
  isInstallDismissed,
  installDismissalMilliseconds,
} from "../../src/modules/campaigns/lib/pwa-support";

test("iPhone, iPad e iPadOS desktop detectados; Android/desktop no reciben guía iOS", () => {
  for (const agent of ["iPhone", "iPad", "iPod"])
    assert.equal(isAppleMobile(agent, 1), true);
  assert.equal(isAppleMobile("Macintosh", 5), true);
  assert.equal(isAppleMobile("Macintosh", 0), false);
  assert.equal(isAppleMobile("Android", 5), false);
});
test("Descartar instalación siete días, expiración y timestamp inválido no bloquean permanentemente", () => {
  const now = 1800000000000;
  assert.equal(isInstallDismissed(String(now - 1000), now), true);
  assert.equal(
    isInstallDismissed(String(now - installDismissalMilliseconds), now),
    false,
  );
  for (const value of [null, "NaN", "0", String(now + 1)])
    assert.equal(isInstallDismissed(value, now), false);
});
test("Offline: ni POST ni GET llaman al servidor o anuncian éxito; vuelta a red permite actualizar", async () => {
  const original = globalThis.fetch,
    descriptor = Object.getOwnPropertyDescriptor(navigator, "onLine");
  let calls = 0;
  try {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    globalThis.fetch = async () => {
      calls++;
      return new Response("{}", { status: 200 });
    };
    for (const method of ["POST", "GET"])
      await assert.rejects(
        campaignFetch("/api/campanas/participant/notifications/read", {
          method,
        }),
        { message: offlineMessage },
      );
    assert.equal(calls, 0);
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    assert.equal(
      (await campaignFetch("/api/campanas/participant/notifications")).status,
      200,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    if (descriptor) Object.defineProperty(navigator, "onLine", descriptor);
    else Reflect.deleteProperty(navigator, "onLine");
  }
});
test("Caída de red no se presenta como mutación guardada; todas las llamadas fuerzan no-store", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_input, options) => {
      assert.equal(options?.cache, "no-store");
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      campaignFetch("/api/campanas/participant/notifications/read", {
        method: "POST",
        cache: "force-cache",
      }),
      { message: offlineMessage },
    );
  } finally {
    globalThis.fetch = original;
  }
});
