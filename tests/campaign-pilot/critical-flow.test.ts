import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { deleteApp } from "firebase-admin/app";
import { deleteApp as deleteClientApp } from "firebase/app";
import { connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { connectFirestoreEmulator, terminate } from "firebase/firestore";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import {
  fixtureEmail,
  fixturePassword,
  seedDashboardFixture,
} from "../campaign-admin-dashboard/fixture";
import {
  configurePilot,
  clearPilot,
  invokeAuth,
  pilotPhone,
  pilotPin,
  pilotSecret,
} from "./auth-burst";
import { ParticipantAuthService } from "../../src/modules/campaigns/server/auth/service";
import {
  CampaignRegistrationService,
  registrationId,
} from "../../src/modules/campaigns/server/registration-service";
import { PairRequestService } from "../../src/modules/campaigns/server/pair-request-service";
import {
  changePlannerStatus,
  setBlockPoint,
  createAssignment,
} from "../../src/modules/campaigns/server/planner-service";
import {
  getProgram,
  publishProgram,
  getPersonalProgram,
} from "../../src/modules/campaigns/server/program-service";
import { createChangeRequest } from "../../src/modules/campaigns/server/change-request-participant";
import {
  adminChanges,
  decideChange,
  resolveChange,
} from "../../src/modules/campaigns/server/change-request-admin";
import { notificationsPage } from "../../src/modules/campaigns/server/notification-center";
import { renderProgramPdf } from "../../src/modules/campaigns/server/program-pdf";

let client: typeof import("../../src/lib/firebase");
before(async () => {
  configurePilot();
  await clearPilot();
  // These literal values identify only the demo emulator, not FCM credentials.
  Object.assign(process.env, {
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-emulator-only",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-campaign-auth.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-campaign-auth",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-campaign-auth.test",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
    NEXT_PUBLIC_FIREBASE_APP_ID: "demo-emulator-only",
  });
  client = await import("../../src/lib/firebase");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  connectFirestoreEmulator(client.db, host, Number(port));
  connectAuthEmulator(
    client.auth,
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
    { disableWarnings: true },
  );
});
after(async () => {
  await clearPilot();
  await terminate(client.db);
  await deleteClientApp(client.app);
  await campaignsAdminDb().terminate();
  await deleteApp(campaignsAdminApp());
});
test("Flujo crítico por repositorio público y servicios autorizados: configuración → registro → accepted → planner → v1 → cambio → v2", async () => {
  const credentials = await seedDashboardFixture();
  await signInWithEmailAndPassword(client.auth, fixtureEmail, fixturePassword);
  const { campaignRepository: repository } = await import(
    "../../src/modules/campaigns/repositories/campaign-repository"
  );
  const campaign = await repository.createCampaign(
    {
      name: "Piloto E2E ficticio configurable",
      status: "draft",
      defaultCapacityPerBlock: 16,
      maxPointsDefault: 8,
    },
    client.auth.currentUser!.uid,
  );
  const congregationIds: string[] = [],
    days: string[] = [],
    blocks: string[] = [],
    points: string[] = [];
  for (let index = 0; index < 4; index++) {
    const doc = await repository.saveCongregation({
      name: `E2E congregación ficticia ${index}`,
      active: true,
    });
    congregationIds.push(doc.id);
    await repository.addCampaignCongregation(campaign, doc.id);
  }
  for (let day = 0; day < 3; day++) {
    const doc = await repository.saveDay(campaign, {
      date: ["2026-10-30", "2026-10-31", "2026-11-01"][day],
      active: true,
    });
    assert.ok(doc);
    days.push(doc.id);
    for (let block = 0; block < 8; block++) {
      const doc = await repository.saveBlock(campaign, days[day], {
        startTime: `${String(8 + block).padStart(2, "0")}:00`,
        endTime: `${String(9 + block).padStart(2, "0")}:00`,
        active: true,
      });
      assert.ok(doc);
      blocks.push(doc.id);
    }
  }
  await changePlannerStatus(credentials.token, campaign, {
    status: "registration_open",
  });
  const tokens: string[] = [],
    people: string[] = [],
    regs: string[] = [];
  const auth = new ParticipantAuthService(campaignsAdminDb(), pilotSecret),
    registrations = new CampaignRegistrationService(campaignsAdminDb(), auth),
    pairs = new PairRequestService(campaignsAdminDb(), auth);
  for (let index = 0; index < 4; index++) {
    const response = await invokeAuth("register", {
      fullName: `Persona E2E ficticia ${index}`,
      phone: pilotPhone(2000 + index),
      pin: pilotPin,
      confirmPin: pilotPin,
    });
    assert.equal(response.status, 200);
    tokens.push(
      response.headers.get("set-cookie")!.split(";")[0].split("=")[1],
    );
    people.push((await response.json()).participant.id);
    regs.push(registrationId(campaign, people[index]));
    await registrations.save(tokens[index], campaign, {
      congregationId: congregationIds[index],
      maxTurns: null,
      timeBlockIds: [blocks[0], blocks[1]],
    });
  }
  const request = await pairs.mutate(tokens[0], campaign, {
    action: "create",
    recipientRegistrationId: regs[1],
  });
  assert.equal(request.status, "pending");
  await pairs.mutate(tokens[1], campaign, {
    action: "accept",
    requestId: request.id,
  });
  await changePlannerStatus(credentials.token, campaign, {
    status: "planning",
  });
  for (let index = 0; index < 8; index++) {
    const doc = await repository.savePoint(campaign, {
      name: `E2E punto ${index + 1}`,
      active: true,
    });
    assert.ok(doc);
    points.push(doc.id);
    await setBlockPoint(credentials.token, campaign, {
      timeBlockId: blocks[0],
      pointId: doc.id,
      active: true,
    });
  }
  await createAssignment(credentials.token, campaign, {
    timeBlockId: blocks[0],
    pointId: points[0],
    slotNumber: 1,
    registrationId: regs[0],
  });
  await createAssignment(credentials.token, campaign, {
    timeBlockId: blocks[1],
    pointId: points[0],
    slotNumber: 1,
    registrationId: regs[3],
  }).then(
    () => assert.fail("Punto inactivo debe bloquear"),
    (error) => assert.equal(error.status, 409),
  );
  await setBlockPoint(credentials.token, campaign, {
    timeBlockId: blocks[1],
    pointId: points[0],
    active: true,
  });
  await createAssignment(credentials.token, campaign, {
    timeBlockId: blocks[1],
    pointId: points[0],
    slotNumber: 1,
    registrationId: regs[3],
  });
  const draft = await getProgram(credentials.token, campaign);
  assert.deepEqual(draft.blockingErrors, []);
  const v1 = await publishProgram(credentials.token, campaign, {
      expectedPlannerRevision: draft.plannerRevision,
      confirmWarnings: true,
    }),
    pdf1 = await renderProgramPdf(v1);
  const before = await getPersonalProgram(tokens[0], false, true);
  assert.equal(before.campaigns[0].turns.length, 1);
  assert.equal(
    before.campaigns[0].turns[0].companionName,
    "Persona E2E ficticia 1",
  );
  assert.ok(!JSON.stringify(before).includes("Persona E2E ficticia 3"));
  const change = await createChangeRequest(tokens[0], {
    turnId: before.campaigns[0].turns[0].turnId,
    reasonCode: "cannot_attend",
  });
  await decideChange(credentials.token, campaign, change.id, "approve", {});
  assert.deepEqual(
    (await getProgram(credentials.token, campaign)).snapshot,
    v1.snapshot,
  );
  const context = await adminChanges(credentials.token, campaign, change.id);
  assert.ok(
    context.requests[0].reserves.some(
      (person) => person.registrationId === regs[2],
    ),
  );
  const v2 = await resolveChange(credentials.token, campaign, change.id, {
    expectedProgramVersion: context.expectedProgramVersion,
    currentProgramVersionId: context.currentProgramVersionId,
    expectedRevision: context.expectedRevision,
    replacementRegistrationId: regs[2],
    confirmUnit: true,
    confirmWarnings: true,
  });
  assert.equal(v2.version, 2);
  assert.equal(
    (await getPersonalProgram(tokens[2])).campaigns[0].turns.length,
    1,
  );
  assert.equal(
    (await getPersonalProgram(tokens[0])).campaigns[0].turns.length,
    0,
  );
  assert.deepEqual(
    await renderProgramPdf(await getProgram(credentials.token, campaign, 1)),
    pdf1,
  );
  assert.notDeepEqual(await renderProgramPdf(v2), pdf1);
  assert.ok(
    (await notificationsPage(tokens[0])).notifications.some(
      (notice) => notice.type === "change_request_resolved",
    ),
  );
  assert.equal(
    (
      await campaignsAdminDb().collection("campaigns").doc(campaign).get()
    ).data()!.createdBy,
    client.auth.currentUser!.uid,
  );
});
