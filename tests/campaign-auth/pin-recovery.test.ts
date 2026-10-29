import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { deleteApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { campaignsAdminApp, campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import { CampaignOrganizationService } from "../../src/modules/campaigns/server/organization-service";
import { seedPlannerFixture, fixtureCampaign } from "../campaign-planner/fixture";
import { fixtureScopedOrganizerToken } from "../campaign-admin-dashboard/fixture";
import { NextRequest } from "next/server";
import { POST as webReset } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/participants/[registrationId]/reset-pin/route";
import { POST as pwaReset } from "../../src/app/api/campanas/organization/campaigns/[campaignId]/participants/[registrationId]/reset-pin/route";
import { POST as authAction, GET as authGet } from "../../src/app/api/campanas/auth/[action]/route";
import { GET as organizationOverview } from "../../src/app/api/campanas/organization/campaigns/[campaignId]/route";

process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
process.env.CAMPAIGNS_AUTH_SECRET = "temporary-pin-recovery-local-test-secret";
process.env.CAMPAIGNS_APP_ORIGIN = "http://localhost:3000";
assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, "Only local emulators may be used");
const db = campaignsAdminDb();
const auth = new ParticipantAuthService(db, "temporary-pin-recovery-local-test-secret");
const service = new CampaignOrganizationService(db, auth);
let organizer: Awaited<ReturnType<typeof auth.register>>;
let helper: Awaited<ReturnType<typeof auth.register>>;
let member: Awaited<ReturnType<typeof auth.register>>;
let outsider: Awaited<ReturnType<typeof auth.register>>;
before(async () => {
  await seedPlannerFixture();
  const account = (phone: string) => auth.register({ fullName: "Persona Prueba", phone, pin: "1234", confirmPin: "1234", congregationId: "cong-0" });
  [organizer, helper, member, outsider] = await Promise.all([account("+56971112221"), account("+56971112222"), account("+56971112223"), account("+56971112224")]);
  const batch = db.batch();
  for (const [id, account] of [["recovery-org", organizer], ["recovery-helper", helper], ["recovery-member", member], ["recovery-outsider", outsider]] as const)
    batch.set(db.collection("campaignRegistrations").doc(id), { campaignId: fixtureCampaign, participantId: account.participant.id, congregationId: "cong-0", registrationStatus: "active" });
  batch.set(db.collection("campaignTeams").doc(fixtureCampaign), { campaignId: fixtureCampaign, primaryRegistrationId: "recovery-org", helperRegistrationIds: ["recovery-helper"] });
  batch.set(db.collection("campaignRegistrations").doc("foreign-registration"), { campaignId: "empty-draft", participantId: outsider.participant.id, congregationId: "cong-0", registrationStatus: "active" });
  await batch.commit();
});
after(async () => { for (const app of getApps()) { await getFirestore(app).terminate(); await deleteApp(app); } });

test("Solo organizadores de la campaña pueden restablecer PIN de sus participantes", async () => {
  await assert.rejects(service.resetParticipantPin(outsider.token, fixtureCampaign, "recovery-member", "2468"), /no tiene acceso/);
  await assert.rejects(service.resetParticipantPin(organizer.token, fixtureCampaign, "foreign-registration", "2468"), /inscripción activa/);
  await assert.rejects(service.resetParticipantPin(helper.token, fixtureCampaign, "recovery-org", "2468"), /solo el superadministrador/);
  await assert.rejects(service.resetParticipantPin(helper.token, fixtureCampaign, "recovery-member", "abc"), /4 a 6/);
});

test("PIN temporal revoca sesiones y exige elegir otro antes de acceder", async () => {
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(auth.login({ phone: "+56971112223", pin: "9999" }));
  await assert.rejects(auth.login({ phone: "+56971112223", pin: "1234" }), /varios intentos/);
  await service.resetParticipantPin(helper.token, fixtureCampaign, "recovery-member", "2468");
  const stored = (await db.collection("participants").doc(member.participant.id).get()).data()!;
  assert.notEqual(stored.pinHash, "2468");
  assert.equal(stored.mustChangePin, true);
  assert.equal(await auth.current(member.token), null);
  await assert.rejects(auth.login({ phone: "+56971112223", pin: "1234" }));
  const temporary = await auth.login({ phone: "+56971112223", pin: "2468" });
  assert.equal(temporary.participant.mustChangePin, true);
  await assert.rejects(auth.withParticipantTransaction(temporary.token, async () => "private"), /PIN personal/);
  await assert.rejects(auth.changePin(temporary.token, { currentPin: "2468", newPin: "2468", confirmPin: "2468" }), /distinto/);
  await auth.changePin(temporary.token, { currentPin: "2468", newPin: "9753", confirmPin: "9753" });
  assert.equal(await auth.current(temporary.token), null);
  await assert.rejects(auth.login({ phone: "+56971112223", pin: "2468" }));
  const personal = await auth.login({ phone: "+56971112223", pin: "9753" });
  assert.equal(personal.participant.mustChangePin, undefined);
  assert.equal(await auth.withParticipantTransaction(personal.token, async () => "allowed"), "allowed");
});

test("Superadministrador revoca las credenciales administrativas al recuperar otro organizador", async () => {
  let revoked = "";
  const previous = (await db.collection("participants").doc(helper.participant.id).get()).data()!.pinHash;
  await assert.rejects(auth.resetCampaignPin(fixtureCampaign, "recovery-helper", "5678", "super", async () => ({ superAdmin: true }), async () => { throw new Error("revocation unavailable"); }), /revocation unavailable/);
  assert.equal((await db.collection("participants").doc(helper.participant.id).get()).data()!.pinHash, previous);
  assert.ok(await auth.current(helper.token));
  await auth.resetCampaignPin(fixtureCampaign, "recovery-helper", "5678", "super", async () => ({ superAdmin: true }), async (id) => { revoked = id; });
  assert.equal(revoked, helper.participant.id);
  assert.equal(await auth.current(helper.token), null);
  assert.equal((await auth.login({ phone: "+56971112222", pin: "5678" })).participant.mustChangePin, true);
});

test("Los endpoints web y PWA respetan permisos y el acceso con PIN temporal", async () => {
  await db.collection("organizerUsers").doc("web-recovery-admin").set({ uid: "recovery-web-admin", role: "CAMPAIGN_ADMIN", active: true, campaignId: fixtureCampaign });
  const webToken = await fixtureScopedOrganizerToken("recovery-web-admin");
  const context = { params: Promise.resolve({ campaignId: fixtureCampaign, registrationId: "recovery-outsider" }) };
  const headers = { origin: "http://localhost:3000", "content-type": "application/json", authorization: `Bearer ${webToken}` };
  const request = (tokenHeaders: Record<string, string>) => new NextRequest(`http://localhost:3000/api/campanas/admin/campaigns/${fixtureCampaign}/participants/recovery-outsider/reset-pin`, { method: "POST", headers: tokenHeaders, body: JSON.stringify({ newPin: "8642" }) });
  assert.equal((await webReset(request(headers), context)).status, 200);
  assert.equal((await webReset(request({ ...headers, authorization: "Bearer invalid" }), context)).status, 401);
  const pwaReq = new NextRequest(`http://localhost:3000/api/campanas/organization/campaigns/${fixtureCampaign}/participants/recovery-outsider/reset-pin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", cookie: `campaign_participant_session=${organizer.token}` }, body: JSON.stringify({ newPin: "8642" }) });
  assert.equal((await pwaReset(pwaReq, context)).status, 200);
  const login = await authAction(new NextRequest("http://localhost:3000/api/campanas/auth/login", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ phone: "+56971112224", pin: "8642" }) }), { params: Promise.resolve({ action: "login" }) });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).participant.mustChangePin, true);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const session = await authGet(new NextRequest("http://localhost:3000/api/campanas/auth/session", { headers: { cookie } }), { params: Promise.resolve({ action: "session" }) });
  assert.equal((await session.json()).participant.mustChangePin, true);
  const denied = await organizationOverview(new NextRequest(`http://localhost:3000/api/campanas/organization/campaigns/${fixtureCampaign}`, { headers: { cookie } }), { params: Promise.resolve({ campaignId: fixtureCampaign }) });
  assert.equal(denied.status, 403);
  const change = await authAction(new NextRequest("http://localhost:3000/api/campanas/auth/change-pin", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", cookie }, body: JSON.stringify({ currentPin: "8642", newPin: "1357", confirmPin: "1357" }) }), { params: Promise.resolve({ action: "change-pin" }) });
  assert.equal(change.status, 200);
  assert.equal((await auth.login({ phone: "+56971112224", pin: "1357" })).participant.mustChangePin, undefined);
});

test("La recuperación web de un organizador exige superadministrador y revoca Firebase Auth", async () => {
  await getAuth(campaignsAdminApp()).createUser({ uid: helper.participant.id });
  await db.collection("organizerUsers").doc("recovery-web-super").set({ uid: "recovery-web-super", role: "SUPER_ADMIN", active: true });
  const superToken = await fixtureScopedOrganizerToken("recovery-web-super");
  const adminToken = await fixtureScopedOrganizerToken("recovery-web-admin");
  const context = { params: Promise.resolve({ campaignId: fixtureCampaign, registrationId: "recovery-helper" }) };
  const request = (token: string) => new NextRequest(`http://localhost:3000/api/campanas/admin/campaigns/${fixtureCampaign}/participants/recovery-helper/reset-pin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ newPin: "4321" }) });
  assert.equal((await webReset(request(adminToken), context)).status, 403);
  assert.equal((await webReset(request(superToken), context)).status, 200);
  assert.ok((await getAuth(campaignsAdminApp()).getUser(helper.participant.id)).tokensValidAfterTime);
  assert.equal((await auth.login({ phone: "+56971112222", pin: "4321" })).participant.mustChangePin, true);
});

test("Un teléfono repetido no permite restablecer el PIN de la cuenta equivocada", async () => {
  await db.collection("participants").doc("duplicate-phone").set({ active: true, fullName: "Duplicado de prueba", phoneNormalized: "+56971112223" });
  const before = (await db.collection("participants").doc(member.participant.id).get()).data()!.pinHash;
  await assert.rejects(service.resetParticipantPin(organizer.token, fixtureCampaign, "recovery-member", "3333"), /asociado a otra cuenta/);
  assert.equal((await db.collection("participants").doc(member.participant.id).get()).data()!.pinHash, before);
});
