import assert from "node:assert/strict";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";

export const fixtureCampaign = "dashboard-80";
export const fixturePassword = "LocalFixtureOnly-1234";
export const fixtureEmail = "organizer-dashboard@example.test";
export const fixturePhone = (index: number) => `+569${40000000 + index}`;
export const fixtureRegistration = (index: number) =>
  `reg-${index.toString().padStart(2, "0")}`;
function assertLocal() {
  assert.equal(process.env.FIREBASE_ADMIN_PROJECT_ID, "demo-campaign-auth");
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost):/,
  );
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost):/,
  );
}
export async function fixtureToken(email = fixtureEmail) {
  assertLocal();
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-fixture-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: fixturePassword,
        returnSecureToken: true,
      }),
    },
  );
  assert.equal(
    response.status,
    200,
    "Auth Emulator must mint a real Firebase ID token",
  );
  return (await response.json()).idToken as string;
}
export async function seedDashboardFixture() {
  assertLocal();
  const db = campaignsAdminDb(),
    auth = getAuth(campaignsAdminApp());
  for (const [uid, email, claims] of [
    ["dashboard-organizer", fixtureEmail, { campaign_admin: true }],
    ["dashboard-ordinary", "ordinary-dashboard@example.test", {}],
  ] as const) {
    try {
      await auth.getUser(uid);
    } catch {
      await auth.createUser({ uid, email, password: fixturePassword });
    }
    await auth.updateUser(uid, { disabled: false });
    await auth.setCustomUserClaims(uid, claims);
  }
  const batch = db.batch(),
    now = Timestamp.now();
  const put = (collection: string, id: string, data: Record<string, unknown>) =>
    batch.set(db.collection(collection).doc(id), data);
  put("users", "dashboard-organizer-profile", {
    firebaseAuthUid: "dashboard-organizer",
    name: "Organizador ficticio",
    email: fixtureEmail,
    role: "Encargado Territorio",
    status: "Activo",
  });
  put("campaigns", fixtureCampaign, {
    name: "Campaña ficticia · 80 participantes",
    description: "Datos locales de prueba",
    locationName: "Lugar ficticio",
    locationDetails: "Solo emuladores",
    status: "registration_open",
    defaultCapacityPerBlock: 16,
    maxPoints: 4,
    createdAt: now,
    updatedAt: now,
  });
  for (let index = 0; index < 4; index++) {
    put("congregations", `cong-${index}`, {
      name: `Congregación ficticia ${index + 1}`,
      active: true,
    });
    put("campaignCongregations", `association-${index}`, {
      campaignId: fixtureCampaign,
      congregationId: `cong-${index}`,
    });
  }
  for (let index = 0; index < 3; index++)
    put("campaignDays", `day-${index}`, {
      campaignId: fixtureCampaign,
      date: ["2026-10-30", "2026-10-31", "2026-11-01"][index],
      label: `Día ${index + 1}`,
      active: index < 2,
    });
  for (let index = 0; index < 7; index++)
    put("timeBlocks", `block-${index}`, {
      campaignId: fixtureCampaign,
      campaignDayId: index < 3 ? "day-0" : index < 6 ? "day-1" : "day-2",
      startTime: `${8 + index * 2}`.padStart(2, "0") + ":00",
      endTime: `${10 + index * 2}`.padStart(2, "0") + ":00",
      label: [
        "Apoyo",
        "Completo",
        "Casi completo",
        "Medio",
        "Capacidad cero",
        "Inactivo",
        "Día inactivo",
      ][index],
      active: index !== 5,
      ...(index === 4 ? { capacityOverride: 0 } : {}),
    });
  // Bulk operational fixture intentionally does not call public registration or bypass its rate limits.
  for (let index = 0; index < 80; index++) {
    const registrationId = fixtureRegistration(index);
    put("participants", `person-${index}`, {
      fullName:
        index === 0
          ? "José Álvarez Ficticio"
          : `Participante ficticio ${index.toString().padStart(2, "0")}`,
      congregationId: `cong-${index % 4}`,
      active: index !== 77,
      phoneNormalized: fixturePhone(index),
      pinHash: "SENSITIVE_SENTINEL",
      createdAt: now,
      updatedAt: now,
    });
    put("campaignRegistrations", registrationId, {
      campaignId: fixtureCampaign,
      participantId: `person-${index}`,
      maxTurns: index % 4 === 0 ? null : (index % 3) + 1,
      registrationStatus:
        index === 78 ? "withdrawn" : index === 79 ? "cancelled" : "active",
      createdAt: now,
      updatedAt: now,
    });
    const selected = [
      index < 6 && 0,
      index < 19 && 1,
      index < 14 && 2,
      index >= 20 && index < 30 && 3,
      index >= 70 && 4,
      index < 2 && 5,
      index < 2 && 6,
      index < 2 && 7,
    ].filter((value): value is number => value !== false);
    for (const block of selected)
      put("availabilities", `availability-${index}-${block}`, {
        campaignId: fixtureCampaign,
        registrationId,
        timeBlockId: `block-${block}`,
        available: true,
        createdAt: now,
        updatedAt: now,
      });
  }
  put("availabilities", "false-selection", {
    campaignId: fixtureCampaign,
    registrationId: fixtureRegistration(30),
    timeBlockId: "block-0",
    available: false,
    createdAt: now,
    updatedAt: now,
  });
  for (const [id, a, b, status] of [
    ["accepted-normal", 0, 1, "accepted"],
    ["accepted-conflict", 2, 20, "accepted"],
    ["pending", 3, 4, "pending"],
    ["rejected", 5, 6, "rejected"],
    ["cancelled", 7, 8, "cancelled"],
  ] as const)
    put("pairRequests", id, {
      campaignId: fixtureCampaign,
      requesterRegistrationId: fixtureRegistration(a),
      recipientRegistrationId: fixtureRegistration(b),
      status,
      createdAt: now,
      updatedAt: now,
    });
  put("campaigns", "empty-draft", { name: "Borrador vacío", status: "draft" });
  put("campaigns", "undefined-capacity", {
    name: "Sin capacidad",
    status: "registration_closed",
  });
  put("campaignDays", "undefined-day", {
    campaignId: "undefined-capacity",
    active: true,
    date: "2026-11-01",
  });
  put("timeBlocks", "undefined-block", {
    campaignId: "undefined-capacity",
    campaignDayId: "undefined-day",
    active: true,
    startTime: "08:00",
    endTime: "10:00",
  });
  put("campaignRegistrations", "foreign-registration", {
    campaignId: "undefined-capacity",
    participantId: "person-0",
    registrationStatus: "active",
    maxTurns: 1,
  });
  put("pairRequests", "invalid-cross-campaign", {
    campaignId: fixtureCampaign,
    requesterRegistrationId: fixtureRegistration(10),
    recipientRegistrationId: "foreign-registration",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();
  return {
    token: await fixtureToken(),
    ordinaryToken: await fixtureToken("ordinary-dashboard@example.test"),
  };
}
