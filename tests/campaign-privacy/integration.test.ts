import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { getAuth } from "firebase-admin/auth";
import { deleteApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { NextRequest } from "next/server";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { CongregationReviewService } from "../../src/modules/campaigns/server/congregation-review-service";
import { CampaignAdminDashboardService } from "../../src/modules/campaigns/server/admin-dashboard-service";
import {
  participantAuth,
  SESSION_COOKIE,
} from "../../src/modules/campaigns/server/auth/session";
import { registrationService } from "../../src/modules/campaigns/server/participant-http";
import { AuthError } from "../../src/modules/campaigns/server/auth/service";
import {
  notificationOutbox,
  pushDeliveries,
} from "../../src/modules/campaigns/server/notification-events";
import { campaignCollections } from "../../src/modules/campaigns/lib/paths";
import {
  fixturePassword,
  fixtureToken,
} from "../campaign-admin-dashboard/fixture";
import { GET as listGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/congregation-participants/route";
import { PATCH as reviewPATCH } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/congregation-participants/[registrationId]/route";
import { GET as participantsGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/route";
import { GET as detailGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/[registrationId]/route";
import { GET as accessGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/access/route";
import { GET as participantGET } from "../../src/app/api/campanas/participant/campaigns/[campaignId]/route";
import { GET as noticesGET } from "../../src/app/api/campanas/participant/notifications/route";

assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:/);
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "", /^127\.0\.0\.1:/);
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
process.env.CAMPAIGNS_AUTH_SECRET =
  "local-privacy-test-secret-never-production";
const db = campaignsAdminDb();
const review = new CongregationReviewService(db);
const dashboard = new CampaignAdminDashboardService(db);
const campaign = "privacy-a";
const congregations = ["MAQUEHUE", "HUICHAHUE", "MAPUDUNGUN", "PULMAHUE"];
const states = ["pending", "approved", "not_approved"] as const;
let env: RulesTestEnvironment;
let responsible: string, admin: string, ordinary: string;
const context = (id = campaign, registrationId = "") => ({
  params: Promise.resolve({ campaignId: id, registrationId }),
});
const req = (path: string, token: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: "http://localhost",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const privateReq = (path: string, token: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: { Cookie: `${SESSION_COOKIE}=${token}` },
  });
const denied = (error: unknown) =>
  error instanceof AuthError && [403, 404].includes(error.status);
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-campaign-auth",
    firestore: {
      host: "127.0.0.1",
      port: 8088,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
  await env.clearFirestore();
  const auth = getAuth(campaignsAdminApp());
  for (const [uid, claim] of [
    ["privacy-responsible", true],
    ["privacy-admin", true],
    ["privacy-participant", false],
  ] as const) {
    await auth.createUser({
      uid,
      email: `${uid}@example.test`,
      password: fixturePassword,
    });
    if (claim) await auth.setCustomUserClaims(uid, { campaign_admin: true });
  }
  responsible = await fixtureToken("privacy-responsible@example.test");
  admin = await fixtureToken("privacy-admin@example.test");
  ordinary = await fixtureToken("privacy-participant@example.test");
  const now = Timestamp.now(),
    batch = db.batch();
  for (const id of [campaign, "privacy-b"])
    batch.set(db.collection("campaigns").doc(id), {
      name: "LOCAL PRIVACY — NO REAL",
      status: "registration_open",
      defaultCapacityPerBlock: 8,
      createdAt: now,
      updatedAt: now,
    });
  batch.set(db.collection("organizerUsers").doc("privacy-admin"), {
    uid: "privacy-admin",
    role: "CAMPAIGN_ADMIN",
    campaignId: campaign,
    active: true,
  });
  batch.set(db.collection("organizerUsers").doc("privacy-responsible"), {
    uid: "privacy-responsible",
    role: "CONGREGATION_RESPONSIBLE",
    campaignId: campaign,
    congregationId: "MAQUEHUE",
    active: true,
  });
  batch.set(db.collection("campaignDays").doc("privacy-day"), {
    campaignId: campaign,
    date: "2026-10-30",
    active: true,
  });
  batch.set(db.collection("timeBlocks").doc("privacy-block"), {
    campaignId: campaign,
    campaignDayId: "privacy-day",
    active: true,
    startTime: "08:00",
    endTime: "10:00",
  });
  for (const [index, congregationId] of congregations.entries()) {
    batch.set(db.collection("congregations").doc(congregationId), {
      name: congregationId,
      active: true,
    });
    batch.set(db.collection("campaignCongregations").doc(congregationId), {
      campaignId: campaign,
      congregationId,
    });
    for (const status of states) {
      const id = `${congregationId}-${status}`;
      batch.set(db.collection("participants").doc(id), {
        fullName: `${congregationId} ${status} FICTICIO`,
        congregationId,
        phoneNormalized: `+5694000000${index}`,
        active: true,
        createdAt: now,
      });
      batch.set(db.collection("campaignRegistrations").doc(id), {
        campaignId: campaign,
        participantId: id,
        approvalStatus: status,
        registrationStatus: "active",
        maxTurns: 2,
        createdAt: now,
        updatedAt: now,
      });
      batch.set(db.collection("availabilities").doc(id), {
        campaignId: campaign,
        registrationId: id,
        timeBlockId: "privacy-block",
        available: true,
      });
    }
  }
  await batch.commit();
});
after(async () => {
  await env?.cleanup();
  for (const app of getApps()) {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});

for (const status of states)
  test(`Responsable MAQUEHUE ve exclusivamente su congregación ${status}`, async () => {
    const response = await listGET(
      req(
        `/api/campanas/admin/campaigns/${campaign}/congregation-participants?status=${status}`,
        responsible,
      ),
      context(),
    );
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("cache-control") ?? "",
      /private, no-store/,
    );
    assert.deepEqual(
      (await response.json()).map((row: any) => row.registrationId),
      [`MAQUEHUE-${status}`],
    );
  });
for (const congregationId of congregations.slice(1))
  test(`IDs conocidos ${congregationId} pending/not_approved quedan opacos al responsable`, async () => {
    for (const status of ["pending", "not_approved"]) {
      const response = await reviewPATCH(
        req("/api/review", responsible, "PATCH", { status: "approved" }),
        context(campaign, `${congregationId}-${status}`),
      );
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: "Inscripción no encontrada.",
      });
      assert.equal(
        (
          await db
            .collection("campaignRegistrations")
            .doc(`${congregationId}-${status}`)
            .get()
        ).data()!.approvalStatus,
        status,
      );
    }
  });
test("Campaign admin lista y lee approved de las cuatro congregaciones", async () => {
  const view = await dashboard.participants(admin, campaign);
  assert.equal(view.total, 4);
  assert.deepEqual(
    view.rows.map((row) => row.registrationId).sort(),
    congregations.map((id) => `${id}-approved`).sort(),
  );
  for (const id of congregations)
    assert.equal(
      (await dashboard.detail(admin, campaign, `${id}-approved`))
        .registrationId,
      `${id}-approved`,
    );
});
test("Campaign admin no lee pending/not_approved mediante IDs conocidos ni Mi congregación", async () => {
  for (const congregationId of congregations)
    for (const status of ["pending", "not_approved"]) {
      const response = await detailGET(
        req("/api/detail", admin),
        context(campaign, `${congregationId}-${status}`),
      );
      assert.equal(response.status, 404);
      assert.doesNotMatch(
        JSON.stringify(await response.json()),
        /FICTICIO|phone|approvalStatus/,
      );
    }
  await assert.rejects(review.list(admin, campaign), denied);
});
test("Grant A no distingue campaña B de una campaña inexistente", async () => {
  const responses = [];
  for (const id of ["privacy-b", "does-not-exist"]) {
    const response = await participantsGET(
      req("/api/participants", admin),
      context(id),
    );
    responses.push({ status: response.status, body: await response.json() });
    assert.equal(response.status, 404);
    await assert.rejects(review.list(responsible, id), denied);
  }
  assert.deepEqual(responses[0], responses[1]);
});
test("Participante normal no accede APIs admin, aprobación, roles ni grants", async () => {
  for (const handler of [participantsGET, listGET, accessGET]) {
    const response = await handler(req("/api/admin", ordinary), context());
    assert.equal(response.status, 403);
    assert.doesNotMatch(
      JSON.stringify(await response.json()),
      /FICTICIO|approvalStatus|CONGREGATION_RESPONSIBLE|CAMPAIGN_ADMIN/,
    );
  }
  const reviewResponse = await reviewPATCH(
    req("/api/review", ordinary, "PATCH", { status: "approved" }),
    context(campaign, "MAQUEHUE-pending"),
  );
  assert.equal(reviewResponse.status, 403);
  const client = env.authenticatedContext("privacy-participant").firestore();
  for (const name of [
    "organizerUsers",
    "campaignRegistrations",
    "participants",
    "campaigns",
  ]) {
    await assertFails(getDocs(collection(client, name)));
    await assertFails(getDoc(doc(client, name, "privacy-responsible")));
  }
});
for (const [index, status] of ["approved", "not_approved"].entries())
  test(`Approval invisible integrado pending → ${status}`, async () => {
    const profile = await participantAuth().register({
      fullName: `Perfil invisible ${index} — NO REAL`,
      phone: `93100000${index}`,
      pin: "1234",
      confirmPin: "1234",
      congregationId: "MAQUEHUE",
    });
    await registrationService().save(profile.token, campaign, {
      congregationId: "MAQUEHUE",
      timeBlockIds: ["privacy-block"],
      maxTurns: 2,
    });
    const registration = (
      await db
        .collection("campaignRegistrations")
        .where("participantId", "==", profile.participant.id)
        .get()
    ).docs[0];
    assert.equal(registration.data().approvalStatus, "pending");
    const collections = [
      campaignCollections.notifications,
      notificationOutbox,
      pushDeliveries,
      "pushSubscriptions",
    ];
    const counts = async () =>
      Promise.all(
        collections.map(async (name) => (await db.collection(name).get()).size),
      );
    const beforeCounts = await counts();
    const beforeView = await participantGET(
      privateReq("/api/participant", profile.token),
      context(),
    );
    const beforeDTO = await beforeView.json();
    assert.equal(beforeView.status, 200);
    const response = await reviewPATCH(
      req("/api/review", responsible, "PATCH", { status }),
      context(campaign, registration.id),
    );
    assert.equal(response.status, 200);
    assert.equal((await registration.ref.get()).data()!.approvalStatus, status);
    assert.deepEqual(await counts(), beforeCounts);
    const current = await participantAuth().current(profile.token);
    assert.doesNotMatch(
      JSON.stringify(current?.participant),
      /approvalStatus|not_approved|pending/,
    );
    const endpoint = await participantGET(
      privateReq("/api/participant", profile.token),
      context(),
    );
    const endpointDTO = await endpoint.json();
    assert.equal(endpoint.status, 200);
    assert.doesNotMatch(
      JSON.stringify(endpointDTO),
      /approvalStatus|not_approved|pending|revisión|aprobación/i,
    );
    assert.deepEqual(endpointDTO, beforeDTO);
    const notices = await noticesGET(privateReq("/api/notices", profile.token));
    assert.equal(notices.status, 200);
    assert.equal((await notices.json()).notifications.length, 0);
    const audits = await db
      .collection("auditLogs")
      .where("entityId", "==", registration.id)
      .get();
    assert.ok(
      audits.docs.some((doc) => doc.data().action === "registration_reviewed"),
    );
  });
test("Pareja pendiente no filtra identidad privada mediante ficha approved", async () => {
  await db
    .collection("pairRequests")
    .doc("private-pair")
    .set({
      campaignId: campaign,
      requesterRegistrationId: "MAQUEHUE-approved",
      recipientRegistrationId: "HUICHAHUE-pending",
      status: "accepted",
    });
  const detail = await dashboard.detail(admin, campaign, "MAQUEHUE-approved");
  assert.doesNotMatch(
    JSON.stringify(detail),
    /HUICHAHUE-pending|HUICHAHUE pending FICTICIO/,
  );
});
