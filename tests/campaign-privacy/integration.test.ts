import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { getAuth } from "firebase-admin/auth";
import { deleteApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { NextRequest } from "next/server";
import { campaignsAdminApp, campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { CampaignAdminDashboardService } from "../../src/modules/campaigns/server/admin-dashboard-service";
import { CampaignTeamService } from "../../src/modules/campaigns/server/campaign-team-service";
import { participantAuth, SESSION_COOKIE } from "../../src/modules/campaigns/server/auth/session";
import { registrationService } from "../../src/modules/campaigns/server/participant-http";
import { campaignCollections } from "../../src/modules/campaigns/lib/paths";
import { fixturePassword, fixtureToken } from "../campaign-admin-dashboard/fixture";
import { GET as legacyList } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/congregation-participants/route";
import { PATCH as legacyReview } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/congregation-participants/[registrationId]/route";
import { GET as participantsGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/route";
import { GET as detailGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/[registrationId]/route";
import { GET as accessGET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/access/route";
import { GET as teamGET, PATCH as teamPATCH } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/team/route";
import { GET as participantGET } from "../../src/app/api/campanas/participant/campaigns/[campaignId]/route";

assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:/);
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "", /^127\.0\.0\.1:/);
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
process.env.CAMPAIGNS_AUTH_SECRET = "local-privacy-test-secret-never-production";

const db = campaignsAdminDb();
const dashboard = new CampaignAdminDashboardService(db);
const team = new CampaignTeamService(db);
const campaign = "privacy-a";
const congregations = ["MAQUEHUE", "HUICHAHUE", "MAPUDUNGUN", "PULMAHUE"];
const historicalStates = ["pending", "approved", "not_approved"] as const;
let env: RulesTestEnvironment;
let responsible: string, admin: string, superAdmin: string, ordinary: string;
const context = (id = campaign, registrationId = "") => ({ params: Promise.resolve({ campaignId: id, registrationId }) });
const request = (path: string, token: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Origin: "http://localhost", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-campaign-auth",
    firestore: { host, port: Number(port), rules: await readFile("firestore.rules", "utf8") },
  });
  await env.clearFirestore();
  const auth = getAuth(campaignsAdminApp());
  for (const uid of ["privacy-responsible", "privacy-admin", "privacy-super", "privacy-participant"]) {
    await auth.createUser({ uid, email: `${uid}@example.test`, password: fixturePassword });
    if (uid === "privacy-super") await auth.setCustomUserClaims(uid, { super_admin: true, campaign_admin: true });
    else if (uid !== "privacy-participant") await auth.setCustomUserClaims(uid, { campaign_admin: true });
  }
  responsible = await fixtureToken("privacy-responsible@example.test");
  admin = await fixtureToken("privacy-admin@example.test");
  superAdmin = await fixtureToken("privacy-super@example.test");
  ordinary = await fixtureToken("privacy-participant@example.test");
  const now = Timestamp.now();
  const batch = db.batch();
  for (const id of [campaign, "privacy-b"])
    batch.set(db.collection("campaigns").doc(id), {
      name: "LOCAL PRIVACY — NO REAL", status: "registration_open", defaultCapacityPerBlock: 8,
      createdAt: now, updatedAt: now,
    });
  batch.set(db.collection("organizerUsers").doc("privacy-admin"), {
    uid: "privacy-admin", role: "CAMPAIGN_ADMIN", campaignId: campaign, active: true,
  });
  batch.set(db.collection("organizerUsers").doc("privacy-responsible"), {
    uid: "privacy-responsible", role: "CONGREGATION_RESPONSIBLE", campaignId: campaign,
    congregationId: "MAQUEHUE", active: true,
  });
  batch.set(db.collection("campaignDays").doc("privacy-day"), { campaignId: campaign, date: "2026-10-30", active: true });
  batch.set(db.collection("timeBlocks").doc("privacy-block"), {
    campaignId: campaign, campaignDayId: "privacy-day", active: true, startTime: "08:00", endTime: "10:00",
  });
  for (const [index, congregationId] of congregations.entries()) {
    batch.set(db.collection("congregations").doc(congregationId), { name: congregationId, active: true });
    batch.set(db.collection("campaignCongregations").doc(congregationId), { campaignId: campaign, congregationId });
    for (const status of historicalStates) {
      const id = `${congregationId}-${status}`;
      batch.set(db.collection("participants").doc(id), {
        fullName: `${congregationId} ${status} FICTICIO`, congregationId,
        phoneNormalized: `+569400000${index}${historicalStates.indexOf(status)}`, active: true, createdAt: now,
      });
      batch.set(db.collection("campaignRegistrations").doc(id), {
        campaignId: campaign, participantId: id, approvalStatus: status, registrationStatus: "active",
        maxTurns: 2, createdAt: now, updatedAt: now,
      });
      batch.set(db.collection("availabilities").doc(id), {
        campaignId: campaign, registrationId: id, timeBlockId: "privacy-block", available: true,
      });
    }
  }
  await batch.commit();
});

after(async () => {
  await env?.cleanup();
  for (const app of getApps()) { await getFirestore(app).terminate(); await deleteApp(app); }
});

test("registros históricos activos entran al pool sin revisión y sin perder su campo legacy", async () => {
  const view = await dashboard.participants(admin, campaign);
  assert.equal(view.total, 12);
  assert.deepEqual(view.rows.map((row) => row.registrationId).sort(),
    congregations.flatMap((id) => historicalStates.map((status) => `${id}-${status}`)).sort());
  for (const status of historicalStates) {
    const detail = await dashboard.detail(admin, campaign, `MAQUEHUE-${status}`);
    assert.equal(detail.registrationId, `MAQUEHUE-${status}`);
    assert.equal((await db.collection("campaignRegistrations").doc(`MAQUEHUE-${status}`).get()).data()?.approvalStatus, status);
  }
});

test("registro nuevo con disponibilidad aparece sin aprobación humana y el DTO no revela estado interno", async () => {
  const profile = await participantAuth().register({
    fullName: "Participante nuevo — NO REAL", phone: "931000001", pin: "1234", confirmPin: "1234", congregationId: "MAQUEHUE",
  });
  await registrationService().save(profile.token, campaign, {
    congregationId: "MAQUEHUE", timeBlockIds: ["privacy-block"], maxTurns: 2,
  });
  const registration = (await db.collection("campaignRegistrations").where("participantId", "==", profile.participant.id).get()).docs[0];
  assert.equal(registration.data().registrationStatus, "active");
  assert.equal(registration.data().approvalStatus, undefined);
  assert.ok((await dashboard.participants(admin, campaign)).rows.some((row) => row.registrationId === registration.id));
  const response = await participantGET(new NextRequest("http://localhost/participant", {
    headers: { Cookie: `${SESSION_COOKIE}=${profile.token}` },
  }), context());
  assert.equal(response.status, 200);
  assert.doesNotMatch(JSON.stringify(await response.json()), /approvalStatus|not_approved|revisión|aprobación/i);
});

test("responsable legacy no entra al flujo administrativo nuevo ni a Mi congregación", async () => {
  for (const [handler, expected] of [[participantsGET, 404], [accessGET, 403], [teamGET, 403]] as const) {
    const response = await handler(request("/api/admin", responsible), context());
    assert.equal(response.status, expected);
  }
  assert.equal((await legacyList()).status, 410);
  assert.equal((await legacyReview()).status, 410);
});

test("grant de campaña A no permite ver campaña B ni distinguirla de una inexistente", async () => {
  const responses = [];
  for (const id of ["privacy-b", "does-not-exist"]) {
    const response = await participantsGET(request("/api/participants", admin), context(id));
    responses.push({ status: response.status, body: await response.json() });
    assert.equal(response.status, 404);
  }
  assert.deepEqual(responses[0], responses[1]);
  assert.equal((await teamGET(request("/api/team", admin), context("privacy-b"))).status, 403);
});

test("participante normal no accede APIs admin ni colección de equipo", async () => {
  for (const handler of [participantsGET, accessGET, teamGET]) {
    const response = await handler(request("/api/admin", ordinary), context());
    assert.equal(response.status, 403);
    assert.doesNotMatch(JSON.stringify(await response.json()), /FICTICIO|approvalStatus|CAMPAIGN_ADMIN/);
  }
  const client = env.authenticatedContext("privacy-participant").firestore();
  for (const name of ["organizerUsers", "campaignRegistrations", "participants", "campaignTeams"]) {
    await assertFails(getDocs(collection(client, name)));
    await assertFails(getDoc(doc(client, name, "privacy-a")));
  }
  await assertFails(setDoc(doc(client, "campaignTeams", "privacy-a"), { primaryRegistrationId: "MAQUEHUE-pending" }));
});

test("equipo: un administrador principal, ayudantes únicos, sin conceder permisos técnicos", async () => {
  const initial = await team.view(superAdmin, campaign);
  assert.equal(initial.primary, null);
  assert.equal(initial.revision, 0);
  assert.equal(initial.canEdit, true);
  assert.ok((await team.view(superAdmin, campaign, "MAQUEHUE")).candidates.length > 0);
  const first = await team.change(superAdmin, campaign, {
    action: "setPrimary", registrationId: "MAQUEHUE-pending", expectedRevision: 0,
  });
  assert.equal(first.primary?.registrationId, "MAQUEHUE-pending");
  const second = await team.change(superAdmin, campaign, {
    action: "addHelper", registrationId: "HUICHAHUE-not_approved", expectedRevision: 1,
  });
  assert.deepEqual(second.helpers.map((row) => row.registrationId), ["HUICHAHUE-not_approved"]);
  await assert.rejects(team.change(superAdmin, campaign, {
    action: "addHelper", registrationId: "HUICHAHUE-not_approved", expectedRevision: 2,
  }), /ya forma parte/);
  const third = await team.change(superAdmin, campaign, {
    action: "setPrimary", registrationId: "HUICHAHUE-not_approved", expectedRevision: 2,
  });
  assert.equal(third.primary?.registrationId, "HUICHAHUE-not_approved");
  assert.equal(third.helpers.length, 0);
  await assert.rejects(team.change(superAdmin, campaign, {
    action: "addHelper", registrationId: "MAQUEHUE-approved", expectedRevision: 2,
  }), /equipo cambió/);
  const fourth = await team.change(superAdmin, campaign, {
    action: "addHelper", registrationId: "MAQUEHUE-approved", expectedRevision: 3,
  });
  assert.equal(fourth.helpers.length, 1);
  assert.equal((await db.collection(campaignCollections.organizerUsers).where("uid", "==", "HUICHAHUE-not_approved").get()).size, 0);
  assert.equal((await db.collection(campaignCollections.campaignTeams).doc(campaign).get()).data()?.revision, 4);
});

test("campaign admin puede consultar equipo, pero no designar; participante de otra campaña tampoco", async () => {
  assert.equal((await team.view(admin, campaign)).canEdit, false);
  const response = await teamPATCH(request("/api/team", admin, "PATCH", {
    action: "clearPrimary", expectedRevision: 4,
  }), context());
  assert.equal(response.status, 403);
  await assert.rejects(team.change(superAdmin, campaign, {
    action: "setPrimary", registrationId: "HUICHAHUE-approved", expectedRevision: 0,
  }), /equipo cambió/);
});

test("acceso por ID conocido no filtra campañas ajenas", async () => {
  const response = await detailGET(request("/api/detail", admin), context("privacy-b", "MAQUEHUE-approved"));
  assert.equal(response.status, 404);
  assert.doesNotMatch(JSON.stringify(await response.json()), /FICTICIO|approvalStatus/);
});
