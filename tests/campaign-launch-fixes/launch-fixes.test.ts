import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { campaignNavigation } from "../../src/modules/campaigns/lib/admin-navigation";
import {
  campaignStatusLabels,
  pairStatusLabels,
  registrationStatusLabel,
} from "../../src/modules/campaigns/lib/presentation";
import {
  logoutParticipant,
  participantLogoutDestination,
} from "../../src/modules/campaigns/lib/participant-logout";
import {
  waitForCampaignUpdate,
  updateTimeoutMs,
} from "../../src/modules/campaigns/lib/pwa-update";
import { buildRelease } from "../../src/modules/campaigns/lib/build-release.mjs";
import { GET as health } from "../../src/app/api/campanas/health/route";
import {
  timeBlockSchema,
  pointSchema,
} from "../../src/modules/campaigns/schemas/campaign-schemas";

test("Legacy congregation responsible receives no campaign navigation", () => {
  const links = campaignNavigation("CONGREGATION_RESPONSIBLE", "campaign-A");
  assert.deepEqual(links, []);
});
test("Campaña muestra cinco secciones simples sin controles de aprobación ni capacidad global", async () => {
  const editor = await readFile("src/modules/campaigns/components/campaign-admin-v2.tsx", "utf8");
  const settings = await readFile("src/modules/campaigns/components/campaign-settings.tsx", "utf8");
  const general = settings.split("export function CampaignGeneralForm")[1]?.split("export function CampaignCompanionSettings")[0] ?? "";
  const congregations = settings.split("export function CongregationSettings")[1]?.split("export function CampaignInformationForm")[0] ?? "";
  const sections = ["Información general", "Congregaciones participantes", "Equipo de campaña", "Participar con un compañero", "CampaignStatusControls"];
  let previous = -1;
  for (const section of sections) {
    const current = editor.indexOf(section, previous + 1);
    assert.ok(current > previous, `Falta o está fuera de orden: ${section}`);
    previous = current;
  }
  assert.doesNotMatch(general, /Capacidad objetivo por bloque|Máximo de puntos/);
  assert.doesNotMatch(congregations, /responsable|invitación|Generar enlace/i);
  assert.match(settings, /Participa en esta campaña/);
});
for (const role of ["CAMPAIGN_ADMIN", "SUPER_ADMIN"] as const) {
  test(`${role} receives all eight authorized campaign sections`, () => {
    const links = campaignNavigation(role, "campaign-A");
    assert.equal(links.length, 8);
    assert.deepEqual(
      links.map((link) => link.label),
      [
        "Resumen",
        "Campaña",
        "Horarios y puntos",
        "Participantes",
        "Planificación",
        "Programa",
        "Solicitudes",
        "Información",
      ],
    );
    assert.ok(links.every((link) => link.href.includes("campaign-A")));
  });
}
test("Unknown role is fail-closed; paths remain scoped and encoded", () => {
  assert.deepEqual(campaignNavigation(null, "A"), []);
  assert.deepEqual(campaignNavigation("unknown" as never, "A"), []);
  assert.ok(
    campaignNavigation("SUPER_ADMIN", "A/B").every((link) =>
      link.href.includes("A%2FB"),
    ),
  );
});
test("Rendered presentation labels never expose technical campaign/pair/registration enums", () => {
  const labels = [
    ...Object.entries(campaignStatusLabels),
    ...Object.entries(pairStatusLabels),
    ...["active", "withdrawn", "cancelled"].map((state) => [
      state,
      registrationStatusLabel(state),
    ]),
  ];
  for (const [state, label] of labels) {
    const html = renderToStaticMarkup(createElement("span", null, label));
    assert.ok(!html.includes(state));
    assert.ok(html.length > 10);
  }
  assert.equal(
    campaignStatusLabels.registration_open,
    "Inscripciones abiertas",
  );
  assert.match(pairStatusLabels.accepted, /Confirmado/);
  assert.equal(registrationStatusLabel("unknown"), "Estado no disponible");
});
test("Visible status surfaces use the central presenter", async () => {
  for (const component of [
    "campaign-summary",
    "campaign-status-controls",
    "campaign-planner",
    "admin-dashboard",
    "admin-dashboard-detail",
    "admin-dashboard-participants",
    "campaign-admin-v2",
    "pair-requests",
  ]) {
    const source = await readFile(
      `src/modules/campaigns/components/${component}.tsx`,
      "utf8",
    );
    assert.ok(source.includes("lib/presentation"), component);
    assert.ok(
      !/>\s*\{(?:overview\.campaign|view\.campaign|pair|row)\.(?:status|registrationStatus)\}/.test(
        source,
      ),
      component,
    );
  }
});
test("Logout invalidates server session before clearing identity and full-page welcome redirect", async () => {
  const previousFetch = globalThis.fetch;
  const previousNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const actions: string[] = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/campanas/auth/logout");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.body, "{}");
    actions.push("server");
    return Response.json({ ok: true });
  };
  try {
    await logoutParticipant(
      () => actions.push("clear"),
      (route) => actions.push(route),
    );
    assert.deepEqual(actions, [
      "server",
      "clear",
      participantLogoutDestination,
    ]);
    assert.equal(participantLogoutDestination, "/campanas/bienvenida");
    globalThis.fetch = async () =>
      Response.json({ error: "Sesión no cerrada" }, { status: 500 });
    await assert.rejects(
      logoutParticipant(
        () => actions.push("unexpected"),
        () => actions.push("unexpected"),
      ),
      /Sesión no cerrada/,
    );
    assert.equal(actions.length, 3);
    globalThis.fetch = async () => Response.json({ ok: true });
    await assert.rejects(
      logoutParticipant(
        () => {
          throw Error("messaging unavailable");
        },
        (route) => actions.push(route),
      ),
    );
    assert.equal(actions.at(-1), participantLogoutDestination);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNavigator)
      Object.defineProperty(globalThis, "navigator", previousNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
class Worker extends EventTarget {
  state = "installed";
}
test("Update sends activation once, controllerchange wins once and cleans listeners", async () => {
  const worker = new Worker(),
    container = new EventTarget();
  let messages = 0;
  const attempt = waitForCampaignUpdate(
    container,
    worker,
    () => messages++,
    100,
  );
  container.dispatchEvent(new Event("controllerchange"));
  worker.state = "activated";
  worker.dispatchEvent(new Event("statechange"));
  assert.equal(await attempt.promise, "ready");
  assert.equal(messages, 1);
});
test("Activation without clients.claim still completes an update", async () => {
  const worker = new Worker();
  const attempt = waitForCampaignUpdate(new EventTarget(), worker, () => {
    worker.state = "activated";
    worker.dispatchEvent(new Event("statechange"));
  });
  assert.equal(await attempt.promise, "ready");
});
test("Update timeout is bounded, returns control without reloading automatically", async () => {
  assert.equal(updateTimeoutMs, 8_000);
  const attempt = waitForCampaignUpdate(
    new EventTarget(),
    new Worker(),
    () => {},
    1,
  );
  assert.equal(await attempt.promise, "timeout");
});
test("Redundant worker and activation exception recover safely", async () => {
  const redundant = new Worker();
  redundant.state = "redundant";
  assert.equal(
    await waitForCampaignUpdate(new EventTarget(), redundant, () =>
      assert.fail("must not send"),
    ).promise,
    "failed",
  );
  assert.equal(
    await waitForCampaignUpdate(new EventTarget(), new Worker(), () => {
      throw Error("unreachable");
    }).promise,
    "failed",
  );
});
test("Unmount cancellation does not reload; already activated worker resolves without resending", async () => {
  const attempt = waitForCampaignUpdate(
    new EventTarget(),
    new Worker(),
    () => {},
  );
  attempt.cancel();
  assert.equal(await attempt.promise, "cancelled");
  const active = new Worker();
  active.state = "activated";
  assert.equal(
    await waitForCampaignUpdate(new EventTarget(), active, () =>
      assert.fail("must not resend"),
    ).promise,
    "ready",
  );
});
test("Build identity is derived from actual checkout, never stale runtime SHA", () => {
  const actual = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const stale = createHash("sha1").update("stale-runtime").digest("hex");
  const release = buildRelease({ env: { CAMPAIGNS_BUILD_SHA: stale } });
  assert.equal(release.sha, actual);
  assert.equal(release.source, "git");
  assert.notEqual(release.sha, stale);
  assert.ok(release.buildId);
  assert.ok(!Number.isNaN(Date.parse(release.builtAt)));
});
test("Archive source uses source context or explicit build env, otherwise reports build ID honestly", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "campaign-build-identity-"));
  const sha = createHash("sha1").update("archive-source").digest("hex");
  const empty = buildRelease({ cwd, env: { CAMPAIGNS_BUILD_SHA: sha } });
  assert.equal(empty.sha, null);
  assert.equal(empty.source, "build-id");
  assert.notEqual(empty.buildId, buildRelease({ cwd, env: {} }).buildId);
  assert.equal(
    buildRelease({ cwd, env: { CAMPAIGNS_RELEASE_SHA: sha } }).sha,
    sha,
  );
  await writeFile(
    join(cwd, "source-context.json"),
    JSON.stringify({ git: { revisionId: sha } }),
  );
  assert.equal(buildRelease({ cwd, env: {} }).sha, sha);
  assert.equal(buildRelease({ cwd, env: {} }).source, "source-context");
});
test("Health uses compiled release values and ignores old runtime deployment metadata", async () => {
  const keys = [
    "CAMPAIGNS_COMPILED_SHA",
    "CAMPAIGNS_COMPILED_SHA_SOURCE",
    "CAMPAIGNS_COMPILED_BUILD_ID",
    "CAMPAIGNS_COMPILED_AT",
    "CAMPAIGNS_BUILD_SHA",
    "CAMPAIGNS_DEPLOYED_AT",
  ];
  const previous = keys.map((key) => process.env[key]);
  const release = buildRelease();
  try {
    Object.assign(process.env, {
      CAMPAIGNS_COMPILED_SHA: release.sha,
      CAMPAIGNS_COMPILED_SHA_SOURCE: release.source,
      CAMPAIGNS_COMPILED_BUILD_ID: release.buildId,
      CAMPAIGNS_COMPILED_AT: release.builtAt,
      CAMPAIGNS_BUILD_SHA: createHash("sha1")
        .update("old-runtime-sha")
        .digest("hex"),
      CAMPAIGNS_DEPLOYED_AT: "2000-01-01T00:00:00.000Z",
    });
    const response = health(),
      body = await response.json();
    assert.equal(body.sha, release.sha);
    assert.equal(body.buildId, release.buildId);
    assert.equal(body.builtAt, release.builtAt);
    assert.ok(!("deployedAt" in body));
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const config = await readFile("next.config.mjs", "utf8");
    assert.ok(config.includes("CAMPAIGNS_COMPILED_SHA: release.sha"));
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
test("Schedule modal inputs preserve zero capacity, false and optional empty fields", () => {
  const block = timeBlockSchema.parse({
    startTime: "08:00",
    endTime: "10:00",
    label: "",
    capacityOverride: "0",
    active: false,
  });
  assert.equal(block.capacityOverride, 0);
  assert.equal(block.active, false);
  assert.equal(block.label, undefined);
  assert.equal(
    pointSchema.parse({ name: "Punto", mapUrl: "", active: false }).active,
    false,
  );
});
test("Schedule forms are dialog-only; days disclose blocks instead of permanently open forms", async () => {
  const source = await readFile(
    "src/modules/campaigns/components/campaign-schedule-settings.tsx",
    "utf8",
  );
  assert.ok(
    source.indexOf("<ScheduleEntityForm") > source.indexOf("<DialogContent"),
  );
  assert.ok(source.includes("aria-expanded"));
  assert.ok(source.includes("expanded[day.id] &&"));
  for (const method of [
    "saveDay",
    "saveBlock",
    "savePoint",
    "deleteDay",
    "deleteBlock",
    "deletePoint",
  ])
    assert.ok(source.includes(`repo.${method}`));
});
