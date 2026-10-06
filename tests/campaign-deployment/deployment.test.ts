import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { deploymentErrors } from "../../src/modules/campaigns/lib/deployment";
import { requireLocalCampaignDemo } from "../../src/modules/campaigns/lib/demo-environment";
import { provisioningArguments } from "../../scripts/campaign-organizer-provision";
import { operationalLog } from "../../src/modules/campaigns/server/operational-log";
import { GET } from "../../src/app/api/campanas/health/route";
import { campaignsRootDestination } from "../../src/modules/campaigns/lib/host-routing";
const read = (file: string) => readFileSync(file, "utf8");
test("Patched proxy-addr removes the newly disclosed critical transitive dependency", () => {
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(lock.packages["node_modules/proxy-addr"].version, "2.0.8");
});
test("Canonical root routing supports only exact public/backend hosts and preserves other routes", () => {
  const env = { CAMPAIGNS_HOST_ROUTING: "true", CAMPAIGNS_APP_ORIGIN: "https://campanas.example.test", CAMPAIGNS_ROUTING_BACKEND_HOSTS: "backend.example.run.app" };
  const request = { pathname: "/", search: "", host: "backend.example.run.app", forwardedHost: "campanas.example.test" };
  assert.equal(campaignsRootDestination(request, env), "https://campanas.example.test/campanas");
  assert.equal(campaignsRootDestination({ ...request, host: "campanas.example.test", forwardedHost: "evil.test" }, env), "https://campanas.example.test/campanas");
  for (const pathname of ["/campanas", "/campanas/admin", "/api/campanas/health", "/api/internal/campanas/turn-reminders", "/dashboard", "/territorios"]) assert.equal(campaignsRootDestination({ ...request, pathname }, env), null);
  for (const search of ["?adminLogin=1", "?adminLogin=", "?adminLogin"]) assert.equal(campaignsRootDestination({ ...request, search }, env), null);
  for (const host of ["d-territorio.cl", "evil.test", "backend.example.run.app.evil.test", "backend.example.run.app:443", null]) assert.equal(campaignsRootDestination({ ...request, host }, env), null);
  for (const forwardedHost of ["evil.test", "campanas.example.test.evil.test", "campanas.example.test, evil.test", " campanas.example.test", "campanas.example.test:443", null]) assert.equal(campaignsRootDestination({ ...request, forwardedHost }, env), null);
  assert.equal(campaignsRootDestination(request, { ...env, CAMPAIGNS_HOST_ROUTING: "false" }), null);
  assert.equal(campaignsRootDestination(request, { ...env, CAMPAIGNS_APP_ORIGIN: "http://campanas.example.test" }), null);
  assert.equal(campaignsRootDestination(request, { ...env, CAMPAIGNS_APP_ORIGIN: "https://campanas.example.test/path" }), null);
  const staging = { ...env, CAMPAIGNS_APP_ORIGIN: "https://stage.example.test" };
  assert.equal(campaignsRootDestination({ ...request, forwardedHost: "stage.example.test" }, staging), "https://stage.example.test/campanas");
  assert.equal(campaignsRootDestination(request, staging), null);
  assert.match(read("src/middleware.ts"), /matcher: \["\/"\]/);
});
// Synthetic validation values; no real project, credentials or deployment.
const valid: Record<string, string | undefined> = {
  CAMPAIGNS_ENV: "staging",
  CAMPAIGNS_STAGING_PROJECT_ID: "synthetic-staging",
  CAMPAIGNS_PRODUCTION_PROJECT_ID: "synthetic-production",
  FIREBASE_ADMIN_PROJECT_ID: "synthetic-staging",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "synthetic-staging",
  CAMPAIGNS_APP_ORIGIN: "https://synthetic.example.test",
  NEXT_PUBLIC_FIREBASE_API_KEY: "synthetic",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "synthetic.example.test",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "synthetic",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "synthetic",
  NEXT_PUBLIC_FIREBASE_APP_ID: "synthetic",
  CAMPAIGNS_AUTH_SECRET: "test-only-deployment-validator-secret-32",
  CAMPAIGNS_NOTIFICATION_JOB_SECRET: "test-only-job-validator-secret-32",
  CAMPAIGNS_TIME_ZONE: "America/Santiago",
  NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE: "America/Santiago",
};
test("Environment validates isolated synthetic config, not cloud readiness", () => {
  assert.deepEqual(deploymentErrors(valid), []);
  assert.deepEqual(
    deploymentErrors({
      ...valid,
      CAMPAIGNS_ENV: "production",
      FIREBASE_ADMIN_PROJECT_ID: "synthetic-production",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "synthetic-production",
    }),
    [],
  );
});
test("Missing critical variables fail closed without leaking supplied secrets", () => {
  for (const key of Object.keys(valid)) {
    const env = { ...valid };
    delete env[key];
    assert.ok(deploymentErrors(env).length, key);
  }
  const errors = JSON.stringify(
    deploymentErrors({ ...valid, CAMPAIGNS_AUTH_SECRET: "private-short" }),
  );
  assert.ok(!errors.includes("private-short"));
});
test("Cross-project clients, staging/prod equality and demo remote rejected", () => {
  assert.ok(
    deploymentErrors({
      ...valid,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "wrong-project",
    }).length,
  );
  assert.ok(
    deploymentErrors({
      ...valid,
      CAMPAIGNS_PRODUCTION_PROJECT_ID: "synthetic-staging",
    }).length,
  );
  assert.ok(
    deploymentErrors({
      ...valid,
      FIREBASE_ADMIN_PROJECT_ID: "demo-campaign-auth",
    }).length,
  );
  for (const key of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"])
    assert.ok(
      deploymentErrors({ ...valid, [key]: "localhost:8088" }).includes(key),
    );
});
test("Origin must be exact HTTPS without user info or localhost", () => {
  for (const origin of [
    "http://synthetic.example.test",
    "https://synthetic.example.test/",
    "https://synthetic.example.test/path",
    "https://user:pass@synthetic.example.test",
    "https://localhost",
    "bad",
  ])
    assert.ok(
      deploymentErrors({ ...valid, CAMPAIGNS_APP_ORIGIN: origin }).includes(
        "CAMPAIGNS_APP_ORIGIN",
      ),
    );
});
test("Time zones, partial Admin credentials and invalid auth budgets fail", () => {
  assert.ok(
    deploymentErrors({ ...valid, CAMPAIGNS_TIME_ZONE: "Invalid" }).length,
  );
  assert.ok(
    deploymentErrors({ ...valid, NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE: "UTC" })
      .length,
  );
  assert.ok(
    deploymentErrors({
      ...valid,
      FIREBASE_ADMIN_CLIENT_EMAIL: "synthetic@example.test",
    }).length,
  );
  for (const value of ["", "0", "Infinity", "-1", "10001"])
    assert.ok(
      deploymentErrors({
        ...valid,
        CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT: value,
      }).length,
    );
});
test("Pilot seed refuses remote, production and missing emulator", () => {
  const local = {
    FIREBASE_ADMIN_PROJECT_ID: "demo-campaign-auth",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8088",
    FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
  };
  requireLocalCampaignDemo(local);
  for (const env of [
    { ...local, NODE_ENV: "production" },
    { ...local, CAMPAIGNS_ENV: "staging" },
    { ...local, FIREBASE_ADMIN_PROJECT_ID: "synthetic-production" },
    { ...local, FIRESTORE_EMULATOR_HOST: "remote.example.test:8088" },
    { ...local, FIREBASE_AUTH_EMULATOR_HOST: undefined },
  ])
    assert.throws(() => requireLocalCampaignDemo(env));
  const fixture = read("tests/campaign-pilot/fixture.ts");
  assert.ok(
    fixture.indexOf("requireLocalCampaignDemo(process.env)") <
      fixture.indexOf("await seedProgramFixture()"),
  );
});
test("Provisioning defaults dry-run and apply requires exact explicit project", () => {
  const args = ["--project", "synthetic-staging", "--uid", "synthetic-user"];
  assert.equal(provisioningArguments(args).apply, false);
  assert.throws(() => provisioningArguments([...args, "--apply"]));
  assert.throws(() =>
    provisioningArguments([
      ...args,
      "--apply",
      "--confirm-project",
      "wrong-project",
    ]),
  );
  assert.equal(
    provisioningArguments([
      ...args,
      "--apply",
      "--confirm-project",
      "synthetic-staging",
    ]).apply,
    true,
  );
  assert.throws(() => provisioningArguments([]));
  assert.throws(() => provisioningArguments([...args, "--unknown"]));
  const script = read("scripts/campaign-organizer-provision.ts");
  assert.match(script, /\.\.\.latest\.customClaims/);
  assert.match(script, /verified\.customClaims\?\.campaign_admin/);
  assert.match(script, /latest\.disabled/);
});
test("App Hosting keeps maxInstances 1, secret references and runtime-only private secrets", () => {
  const config = read("apphosting.yaml");
  assert.match(config, /maxInstances: 1/);
  for (const name of [
    "CAMPAIGNS_AUTH_SECRET",
    "CAMPAIGNS_NOTIFICATION_JOB_SECRET",
  ])
    assert.match(
      config,
      new RegExp(
        `variable: ${name}\\s+secret: ${name}\\s+availability: \\[RUNTIME\\]`,
      ),
    );
  assert.match(read("apphosting.staging.yaml"), /value: staging/);
  assert.match(read("apphosting.production.yaml"), /value: production/);
  assert.ok(!config.includes("PRIVATE_KEY"));
});
test("Example contains names, empty secrets and auth 160/240 defaults", () => {
  const example = read(".env.example");
  for (const name of [
    "CAMPAIGNS_AUTH_SECRET",
    "CAMPAIGNS_NOTIFICATION_JOB_SECRET",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
  ])
    assert.match(example, new RegExp(`^${name}=$`, "m"));
  assert.match(example, /CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT=160/);
  assert.match(example, /CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT=240/);
  assert.ok(!example.includes("NEXT_PUBLIC_CAMPAIGNS_AUTH_SECRET"));
  assert.match(
    read("src/modules/campaigns/server/auth/rate-limits.ts"),
    /register: 160/,
  );
  assert.match(
    read("src/modules/campaigns/server/auth/rate-limits.ts"),
    /login: 240/,
  );
});
test("No tracked real env/service-account/OAuth credential material", () => {
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  assert.ok(paths.every((p) => !/^\.env(?!\.example$)/.test(p)));
  for (const path of paths.filter((p) =>
    /\.(json|yaml|yml|env|md|ts|tsx|js|cjs)$/.test(p),
  )) {
    const content = existsSync(path)
      ? read(path)
      : execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" });
    assert.ok(!/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(content), path);
    assert.ok(!/"type"\s*:\s*"service_account"/.test(content), path);
    assert.ok(!/"refresh_token"\s*:\s*"[^"\s]{20,}"/.test(content), path);
  }
});
test("Manifest, Rules/indexes and deploy configuration present without new permissions", () => {
  const manifest = JSON.parse(read("public/campanas.webmanifest"));
  assert.equal(manifest.start_url, "/campanas");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.length >= 2);
  const config = JSON.parse(read("firebase.campaign-deployment.json"));
  assert.deepEqual(Object.keys(config), ["firestore"]);
  assert.equal(config.firestore.rules, "firestore.rules");
  const indexes = JSON.parse(read(config.firestore.indexes));
  assert.equal(indexes.indexes.length, 3);
  const rules = read(config.firestore.rules);
  for (const name of [
    "campaignProgramVersions",
    "campaignAssignments",
    "changeRequests",
    "campaignNotifications",
    "pushSubscriptions",
    "deviceSessions",
  ])
    assert.ok(rules.includes(name));
});
test("Host routing opt-in preserves admin login and existing permissions", () => {
  const next = read("next.config.mjs");
  assert.match(next, /CAMPAIGNS_HOST_ROUTING !== "true"/);
  assert.match(next, /type: "host"/);
  assert.match(next, /key: "adminLogin"/);
  assert.match(next, /destination: "\/campanas"/);
  assert.match(read("src/app/campanas/admin/layout.tsx"), /MANAGE_CAMPAIGNS/);
  assert.match(read("src/app/campanas/admin/layout.tsx"), /adminLogin=1/);
});
test("Scheduler, restore and rollback procedures do not pretend to be deployed", () => {
  const doc = read("docs/campanas/PHASE_11_DEPLOYMENT_LAUNCH.md");
  for (const text of [
    "STAGING DEPLOY PENDING EXTERNAL",
    "*/15 * * * *",
    "Authorization: Bearer",
    "gcloud firestore export",
    "gcloud firestore import",
    "Rollback código",
    "Rollback Rules",
    "No destructive migration required",
    "PENDIENTE F7",
    "NO-GO DEPLOY PRODUCTIVO",
  ])
    assert.ok(doc.includes(text), text);
  assert.ok(
    !doc.includes(
      "https://campanas.d-territorio.cl/api/internal/campanas/turn-reminders?",
    ),
  );
  assert.ok(
    read("docs/campanas/LAUNCH_CHECKLIST.md").split("- [ ]").length > 25,
  );
});
test("Operational logs only carry fixed safe counters/status, never injected data", () => {
  const lines: string[] = [],
    original = console.info;
  console.info = (value) => {
    lines.push(String(value));
  };
  try {
    operationalLog("participant", 429);
    operationalLog("push", 200, {
      delivered: 1,
      failed: 0,
      skipped: 0,
      token: "sensitive",
    } as never);
    operationalLog("admin", 200);
  } finally {
    console.info = original;
  }
  assert.equal(lines.length, 2);
  assert.ok(!lines.join("").includes("sensitive"));
  assert.deepEqual(Object.keys(JSON.parse(lines[0])), [
    "component",
    "area",
    "status",
  ]);
});
test("Health is private, secret-free and missing metadata is explicitly null", async () => {
  const previous = { ...process.env };
  try {
    for (const key of Object.keys(process.env))
      if (
        key.startsWith("CAMPAIGNS_") ||
        key.startsWith("NEXT_PUBLIC_FIREBASE_") ||
        key === "FIRESTORE_EMULATOR_HOST" ||
        key === "FIREBASE_AUTH_EMULATOR_HOST"
      )
        delete process.env[key];
    Object.assign(process.env, valid);
    const response = GET(),
      body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(body, {
      ready: true,
      environment: "staging",
      sha: null,
      deployedAt: null,
    });
    delete process.env.CAMPAIGNS_AUTH_SECRET;
    assert.equal(GET().status, 503);
    assert.ok(!JSON.stringify(await GET().json()).includes("SECRET"));
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
