import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { performance } from "node:perf_hooks";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { deleteApp } from "firebase-admin/app";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { seedPilotFixture, fixtureCampaign } from "./fixture";
import { configurePilot, clearPilot } from "./auth-burst";
import { CampaignAdminDashboardService } from "../../src/modules/campaigns/server/admin-dashboard-service";
import {
  getPlanner,
  createAssignment,
} from "../../src/modules/campaigns/server/planner-service";
import {
  getProgram,
  publishProgram,
  getPersonalProgram,
} from "../../src/modules/campaigns/server/program-service";
import { programHistory } from "../../src/modules/campaigns/server/program-history";
import { notificationsPage } from "../../src/modules/campaigns/server/notification-center";
import {
  createChangeRequest,
  participantChanges,
} from "../../src/modules/campaigns/server/change-request-participant";
import {
  adminChanges,
  decideChange,
  resolveChange,
} from "../../src/modules/campaigns/server/change-request-admin";
import { renderProgramPdf as generateProgramPdf } from "../../src/modules/campaigns/server/program-pdf";
import { subscribePush } from "../../src/modules/campaigns/server/push-subscriptions";
import { participantAuth } from "../../src/modules/campaigns/server/auth/session";

before(configurePilot);
test("Suscripción concurrente cerrada responde 409 sin ocultar otros errores ni escribir ownership", async () => {
  const data = await seedPilotFixture(80),
    service = participantAuth();
  for (const [error, expected] of [
    [
      Object.assign(
        new Error("3 INVALID_ARGUMENT: Transaction is invalid or closed."),
        { code: 3 },
      ),
      409,
    ],
    [Object.assign(new Error("ABORTED"), { code: 10 }), 409],
    [Object.assign(new Error("Invalid field"), { code: 3 }), undefined],
  ] as const) {
    const transaction = mock.method(
      service,
      "withParticipantTransaction",
      async () => {
        throw error;
      },
    );
    try {
      await assert.rejects(
        subscribePush(data.cookies[7], {
          fcmToken: "FAKE_LOCAL_PILOT_CONFLICT_TOKEN",
        }),
        (failure: any) =>
          expected ? failure.status === expected : failure === error,
      );
      assert.equal(
        (await campaignsAdminDb().collection("pushSubscriptions").get()).size,
        0,
      );
    } finally {
      transaction.mock.restore();
    }
  }
});
after(async () => {
  await clearPilot();
  await campaignsAdminDb().terminate();
  await deleteApp(campaignsAdminApp());
});
test("Seed 80 reproducible: 4 congregaciones, 3 días, 24 bloques, 8 puntos y cobertura variada", async () => {
  const data = await seedPilotFixture(80),
    db = campaignsAdminDb();
  assert.equal((await db.collection("participants").get()).size, 80);
  assert.equal((await db.collection("campaignRegistrations").get()).size, 80);
  const overview = await new CampaignAdminDashboardService(db).overview(
    data.token,
    fixtureCampaign,
  );
  assert.equal(overview.congregations.length, 4);
  assert.equal(overview.days.length, 3);
  assert.equal(overview.days.flatMap((day) => day.blocks).length, 24);
  assert.equal(overview.metrics.acceptedAvailabilityConflicts, 1);
  assert.ok(
    overview.metrics.needsSupportBlocks > 0 && overview.metrics.fullBlocks > 0,
  );
  const draft = await getProgram(data.token, fixtureCampaign);
  assert.deepEqual(draft.blockingErrors, []);
});
test("Planner concurrente con dos UID: un solo ganador en el mismo slot", async () => {
  const data = await seedPilotFixture(80);
  const attempts = await Promise.allSettled(
    [data.token, data.secondToken].map((token, index) =>
      createAssignment(token, fixtureCampaign, {
        timeBlockId: "block-0",
        pointId: "point-2",
        slotNumber: 1,
        registrationId: data.registrations[40 + index],
        overrides: [],
      }),
    ),
  );
  assert.equal(
    attempts.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const planner = await getPlanner(data.token, fixtureCampaign, "block-0");
  assert.equal(
    planner.points
      .find((point) => point.id === "point-2")!
      .slots.filter(Boolean).length,
    1,
  );
});
test("Campaña 80: publicar, aprobación sin cambio, reserva manual accepted, v2/v3 y PDF histórico", async () => {
  const data = await seedPilotFixture(80),
    db = campaignsAdminDb();
  const draft = await getProgram(data.token, fixtureCampaign);
  const published = await Promise.allSettled(
    [data.token, data.secondToken].map((token) =>
      publishProgram(token, fixtureCampaign, {
        expectedPlannerRevision: draft.plannerRevision,
        confirmWarnings: true,
      }),
    ),
  );
  assert.equal(
    published.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const v1 = await getProgram(data.token, fixtureCampaign, 1);
  const pdf1 = await generateProgramPdf(v1);
  const personal = await getPersonalProgram(data.cookies[0], false, true);
  assert.equal(personal.campaigns[0].version, 1);
  const turnId = personal.campaigns[0].turns[0].turnId;
  await assert.rejects(
    createChangeRequest(data.cookies[40], { turnId, reasonCode: "other" }),
    (error: any) => error.status === 404,
  );
  const request = await createChangeRequest(data.cookies[0], {
    turnId,
    reasonCode: "cannot_attend",
    comment: "",
  });
  await decideChange(data.token, fixtureCampaign, request.id, "approve", {});
  assert.deepEqual(
    (await getProgram(data.token, fixtureCampaign)).snapshot,
    v1.snapshot,
  );
  assert.equal(
    (await getPersonalProgram(data.cookies[0])).campaigns[0].version,
    1,
  );
  const context = await adminChanges(data.token, fixtureCampaign, request.id);
  const payload = {
    expectedProgramVersion: context.expectedProgramVersion,
    currentProgramVersionId: context.currentProgramVersionId,
    expectedRevision: context.expectedRevision,
    replacementRegistrationId: data.registrations[40],
    confirmUnit: true,
    confirmWarnings: true,
  };
  const race = await Promise.allSettled(
    [data.token, data.secondToken].map((token) =>
      resolveChange(token, fixtureCampaign, request.id, payload),
    ),
  );
  assert.equal(
    race.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    (await getPersonalProgram(data.cookies[0])).campaigns[0].turns.length,
    0,
  );
  assert.equal(
    (await getPersonalProgram(data.cookies[1])).campaigns[0].turns.length,
    0,
  );
  const incoming = await getPersonalProgram(data.cookies[40], false, true);
  assert.equal(incoming.campaigns[0].version, 2);
  assert.ok(incoming.campaigns[0].turns.length > 0);
  assert.equal(
    (await participantChanges(data.cookies[0]))[0].status,
    "resolved",
  );
  assert.deepEqual(
    (await getProgram(data.token, fixtureCampaign, 1)).snapshot,
    v1.snapshot,
  );
  assert.deepEqual(
    await generateProgramPdf(await getProgram(data.token, fixtureCampaign, 1)),
    pdf1,
  );
  const next = await createChangeRequest(data.cookies[40], {
    turnId: incoming.campaigns[0].turns[0].turnId,
    reasonCode: "other",
  });
  await decideChange(data.token, fixtureCampaign, next.id, "approve", {});
  const c2 = await adminChanges(data.token, fixtureCampaign, next.id);
  const v2 = await getProgram(data.token, fixtureCampaign, 2),
    pdf2 = await generateProgramPdf(v2);
  // Disposable binary evidence for visual QA; generated from immutable snapshots.
  await mkdir("/tmp/campaign-phase10-pdf", { recursive: true });
  await writeFile("/tmp/campaign-phase10-pdf/pilot-80-v1.pdf", pdf1);
  await writeFile("/tmp/campaign-phase10-pdf/pilot-80-v2.pdf", pdf2);
  await resolveChange(data.token, fixtureCampaign, next.id, {
    expectedProgramVersion: 2,
    currentProgramVersionId: c2.currentProgramVersionId,
    expectedRevision: c2.expectedRevision,
    releaseWithoutReplacement: true,
    confirmWarnings: true,
  });
  assert.equal(
    (await getPersonalProgram(data.cookies[40])).campaigns[0].version,
    3,
  );
  assert.deepEqual(
    await generateProgramPdf(await getProgram(data.token, fixtureCampaign, 2)),
    pdf2,
  );
  assert.equal(
    (await programHistory(data.token, fixtureCampaign)).versions.length,
    3,
  );
  assert.equal(
    (await db.collection("campaigns").doc(fixtureCampaign).get()).data()!
      .status,
    "published",
  );
  const notices = await notificationsPage(data.cookies[0]);
  assert.ok(
    notices.notifications.some(
      (notice) => notice.type === "change_request_resolved",
    ),
  );
  assert.ok(
    !/pinHash|phoneNormalized|sessionVersion|resolvedBy|participantId/.test(
      JSON.stringify(notices),
    ),
  );
});
test("Seed 150 y benchmark local: overview, listado, filtros, planner, programa, versiones, avisos, Mi programa", async () => {
  const data = await seedPilotFixture(150),
    db = campaignsAdminDb();
  assert.equal((await db.collection("participants").get()).size, 150);
  assert.ok((await db.collection("availabilities").get()).size > 3000);
  const dashboard = new CampaignAdminDashboardService(db);
  const draft = await getProgram(data.token, fixtureCampaign);
  assert.deepEqual(draft.blockingErrors, []);
  await publishProgram(data.token, fixtureCampaign, {
    expectedPlannerRevision: draft.plannerRevision,
    confirmWarnings: true,
  });
  const operations = {
    overview: () => dashboard.overview(data.token, fixtureCampaign),
    participants: () => dashboard.participants(data.token, fixtureCampaign),
    filters: () =>
      dashboard.participants(data.token, fixtureCampaign, {
        congregationId: "cong-0",
        blockId: "block-0",
        q: "ficticio",
      }),
    planner: () => getPlanner(data.token, fixtureCampaign, "block-0"),
    program: () => getProgram(data.token, fixtureCampaign),
    versions: () => programHistory(data.token, fixtureCampaign),
    notifications: () => notificationsPage(data.cookies[3]),
    myProgram: () => getPersonalProgram(data.cookies[3]),
  };
  for (const [name, operation] of Object.entries(operations)) {
    const times: number[] = [];
    for (let sample = 0; sample < 12; sample++) {
      const start = performance.now();
      await operation();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    console.log(
      "PILOT_PERF",
      JSON.stringify({
        dataset: 150,
        name,
        samples: 12,
        p50Ms: Math.round(times[5]),
        p95Ms: Math.round(times[11]),
        maxMs: Math.round(times[11]),
        errors: 0,
      }),
    );
  }
  const concurrent = await Promise.all(
    Array.from({ length: 4 }, () =>
      dashboard.overview(data.token, fixtureCampaign),
    ),
  );
  assert.ok(
    concurrent.every((view) => view.metrics.activeRegistrations === 150),
  );
  await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      Promise.all([
        notificationsPage(data.cookies[3 + index]),
        getPersonalProgram(data.cookies[3 + index]),
      ]),
    ),
  );
});
test("Active/completed conservan programa oficial de lectura y bloquean mutaciones ordinarias", async () => {
  const data = await seedPilotFixture(80),
    db = campaignsAdminDb();
  const draft = await getProgram(data.token, fixtureCampaign);
  await publishProgram(data.token, fixtureCampaign, {
    expectedPlannerRevision: draft.plannerRevision,
    confirmWarnings: true,
  });
  const official = (await getProgram(data.token, fixtureCampaign)).snapshot;
  for (const status of ["active", "completed"]) {
    await db.collection("campaigns").doc(fixtureCampaign).update({ status });
    const view = await getProgram(data.token, fixtureCampaign);
    assert.equal(view.mode, "published");
    assert.deepEqual(view.snapshot, official);
    const own = await getPersonalProgram(data.cookies[0], false, true);
    assert.equal(own.campaigns[0].published, true);
    assert.equal(own.campaigns[0].turns[0].canRequestChange, false);
    assert.equal(
      (await getPlanner(data.token, fixtureCampaign, "block-0")).mutable,
      false,
    );
    await assert.rejects(
      createChangeRequest(data.cookies[0], {
        turnId: own.campaigns[0].turns[0].turnId,
        reasonCode: "other",
      }),
      (error: any) => error.status === 409,
    );
  }
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  const environment = await initializeTestEnvironment({
    projectId: "demo-campaign-auth",
    firestore: {
      host,
      port: Number(port),
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
  try {
    const client = environment
      .authenticatedContext("dashboard-organizer", { campaign_admin: true })
      .firestore();
    await assertFails(
      updateDoc(doc(client, "campaigns", fixtureCampaign), {
        status: "planning",
      }),
    );
    await assertFails(deleteDoc(doc(client, "campaigns", fixtureCampaign)));
    for (const [collection, id] of [
      ["campaignDays", "day-0"],
      ["timeBlocks", "block-0"],
      ["points", "point-0"],
      ["campaignCongregations", "association-0"],
    ]) {
      await assertFails(
        updateDoc(doc(client, collection, id), { campaignId: "empty-draft" }),
      );
      await assertFails(deleteDoc(doc(client, collection, id)));
      await assertFails(
        setDoc(doc(client, collection, "attempt"), {
          campaignId: fixtureCampaign,
          active: true,
        }),
      );
    }
  } finally {
    await environment.cleanup();
  }
});
