import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// All existing assertions run unchanged. Each process owns a fresh emulator.
const source = readFileSync(
  "tests/campaign-planner/integration.test.ts",
  "utf8",
);
const names = [...source.matchAll(/^test\("([^"]+)"/gm)].map(
  (match) => match[1],
);
const rejectionLabels = [
  ...source
    .slice(
      source.indexOf("for (const [label, value, status]"),
      source.indexOf('test("Punto global'),
    )
    .matchAll(/\[\s*"([^"]+)"/g),
].map((match) => `Rechazo servidor: ${match[1]}`);
names.push(...rejectionLabels);
assert.equal(names.length, 51, "The grouping must cover all 51 original cases");
const races = names.filter((name) =>
  /^(BlockPoint determinístico|Dos UID:|Desactivar vs|Liberar vs|maxTurns concurrente)/.test(
    name,
  ),
);
const others = names.filter((name) => !races.includes(name));
const groups = [
  ...Array.from({ length: Math.ceil(others.length / 8) }, (_, index) =>
    others.slice(index * 8, (index + 1) * 8),
  ),
  ...races.map((name) => [name]),
];
assert.equal(new Set(groups.flat()).size, 51);
const evidence = "docs/campanas/validation-local/planner";
mkdirSync(evidence, { recursive: true });
const results = [];
for (let index = 0; index < groups.length; index++) {
  const group = groups[index];
  const pattern = `^(?:${group.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`;
  const command = `node --require ./tests/campaign-auth/server-only.cjs --import tsx --test --test-name-pattern='${pattern.replaceAll("'", "'\\''")}' tests/campaign-planner/integration.test.ts`;
  console.log(
    `Group ${index + 1}/${groups.length}: ${group.length} cases — ${group.join(" / ")}`,
  );
  const run = spawnSync(
    "npx",
    [
      "--offline",
      "firebase-tools@13.35.1",
      "emulators:exec",
      "--only",
      "auth,firestore",
      "--project",
      "demo-campaign-auth",
      "--config",
      "firebase.campaign-auth.json",
      command,
    ],
    {
      env: {
        ...process.env,
        FIREBASE_ADMIN_PROJECT_ID: "demo-campaign-auth",
        GCLOUD_PROJECT: "demo-campaign-auth",
      },
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  writeFileSync(
    `${evidence}/group-${String(index + 1).padStart(2, "0")}.log`,
    output,
  );
  const passed = Number(output.match(/ℹ pass (\d+)/)?.[1] ?? 0);
  const result = {
    group: index + 1,
    cases: group,
    passed,
    exitCode: run.status,
    error: run.error?.message,
  };
  results.push(result);
  console.log(`Result: ${passed}/${group.length}, exit ${run.status}`);
  writeFileSync(`${evidence}/results.json`, JSON.stringify(results, null, 2));
  if (run.status !== 0 || passed !== group.length) {
    console.error(output.slice(-10000));
    process.exitCode = 1;
    break;
  }
}
if (
  results.length === groups.length &&
  results.every((result) => result.exitCode === 0)
) {
  assert.equal(
    results.reduce((sum, result) => sum + result.passed, 0),
    51,
  );
  console.log(
    "51/51 PASS — every original case executed with fresh emulator groups",
  );
}
