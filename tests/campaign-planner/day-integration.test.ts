import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { deleteApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { getPlannerDay, getPlanner, createAssignment } from "../../src/modules/campaigns/server/planner-service";
import { GET } from "../../src/app/api/campanas/admin/campaigns/[campaignId]/planner/route";
import { seedPlannerFixture, fixtureCampaign as campaign, fixtureRegistration as reg } from "./fixture";

process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-campaign-auth";
assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, "Local emulators required; never use cloud data");
const db = campaignsAdminDb();
let credentials: Awaited<ReturnType<typeof seedPlannerFixture>>;
before(async () => {
  credentials = await seedPlannerFixture();
  const original = (await db.collection("timeBlocks").doc("block-0").get()).data()!;
  const batch = db.batch();
  for (let i = 3; i < 6; i++) batch.set(db.collection("timeBlocks").doc(`daily-${i}`), { ...original, startTime: `${8 + i * 2}:00`, endTime: `${10 + i * 2}:00` });
  await batch.commit();
  await createAssignment(credentials.token, campaign, { timeBlockId: "block-0", pointId: "point-0", slotNumber: 1, registrationId: reg(0) });
  await db.collection("campaignRegistrations").doc(reg(3)).update({ isMinor: true, guardianRegistrationId: reg(4) });
  await createAssignment(credentials.superToken, campaign, { timeBlockId: "block-0", pointId: "point-1", slotNumber: 1, registrationId: reg(3), adultSupportRegistrationId: reg(5), overrides: [{ registrationId: reg(3), capacity: true }] });
  await createAssignment(credentials.superToken, campaign, { timeBlockId: "block-0", pointId: "point-1", slotNumber: 4, registrationId: reg(6), overrides: [{ registrationId: reg(6), capacity: true }] });
});
after(async () => { mock.restoreAll(); for (const app of getApps()) { await getFirestore(app).terminate(); await deleteApp(app); } });
const request = (dayId: string, token = credentials.token) => new NextRequest(`http://localhost/api/campanas/admin/campaigns/${campaign}/planner?dayId=${dayId}`, { headers: { Authorization: `Bearer ${token}` } });
const context = { params: Promise.resolve({ campaignId: campaign }) };

test("Daily API: six blocks, one source transaction, private/no-store", async () => {
  const original = db.runTransaction.bind(db);
  let transactions = 0, campaignReads = 0;
  const spy = mock.method(db, "runTransaction", ((fn: any, options: any) => {
    transactions++;
    assert.equal(options.readOnly, true);
    return original(async (tx) => {
      const get = tx.get.bind(tx);
      tx.get = ((ref: any, ...args: any[]) => { if (ref.path === `campaigns/${campaign}`) campaignReads++; return (get as any)(ref, ...args); }) as typeof tx.get;
      return fn(tx);
    }, options);
  }) as any);
  try {
    const response = await GET(request("day-0"), context);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
    const view = await response.json();
    assert.equal(view.blocks.length, 6); assert.equal(view.day.id, "day-0");
    assert.equal(transactions, 1); assert.equal(campaignReads, 1);
    assert.ok(view.blocks.every((block: any) => block.block.dayId === "day-0" && block.updatedAt === view.updatedAt));
  } finally { spy.mock.restore(); }
});
test("Daily projections preserve assignments, accepted pairs, minor/guardian and four slots", async () => {
  const daily = await getPlannerDay(credentials.superToken, campaign, "day-0");
  const block = daily.blocks.find((view) => view.block?.id === "block-0")!;
  const old = await getPlanner(credentials.superToken, campaign, "block-0");
  assert.deepEqual(block.points, old.points);
  assert.deepEqual(block.available, old.available);
  assert.deepEqual(block.exceptions, old.exceptions);
  assert.equal(block.canAssignSupport, true);
  const pair = block.points.find((point) => point.id === "point-0")!;
  assert.equal(pair.slots[0]!.person.accepted!.otherRegistrationId, reg(1));
  const minor = block.points.find((point) => point.id === "point-1")!;
  assert.deepEqual(minor.slots.map((slot) => slot?.registrationId), [reg(3), reg(4), reg(5), reg(6)]);
  assert.equal(minor.slots[0]!.person.guardianRegistrationId, reg(4));
  assert.equal(minor.slots[0]!.person.isMinor, true);
});
test("Changing day isolates blocks; unknown/foreign day rejected", async () => {
  const view = await getPlannerDay(credentials.token, campaign, "day-1");
  assert.ok(view.blocks.length > 0);
  assert.ok(view.blocks.every((block) => block.block?.dayId === "day-1"));
  assert.equal((await GET(request("undefined-day"), context)).status, 404);
});
test("Daily endpoint still rejects participants and missing credentials", async () => {
  assert.equal((await GET(request("day-0", credentials.ordinaryToken), context)).status, 403);
  assert.equal((await GET(request("day-0", ""), context)).status, 401);
});
