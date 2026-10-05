import { Timestamp } from "firebase-admin/firestore";
import {
  seedProgramFixture,
  fixtureCampaign,
  fixtureSecret,
} from "../campaign-program/fixture";
import { fixtureRegistration } from "../campaign-planner/fixture";
import { campaignsAdminDb } from "../../src/modules/campaigns/server/firebase-admin";
import { blockPointId } from "../../src/modules/campaigns/server/planner-source";
import {
  registrationId,
  availabilityId,
} from "../../src/modules/campaigns/server/registration-service";
import {
  newSessionToken,
  privateKey,
  tokenHash,
  SESSION_SECONDS,
} from "../../src/modules/campaigns/server/auth/crypto";
export { fixtureCampaign, fixtureRegistration, fixtureSecret };

/** Explicit synthetic seed only, inherits local/demo guard and never edits real data. */
export async function seedPilotFixture(size: 80 | 150) {
  const credentials = await seedProgramFixture(),
    db = campaignsAdminDb();
  for (const name of [
    "availabilities",
    "campaignAssignments",
    "blockPoints",
    "timeBlocks",
    "campaignRegistrations",
  ])
    await db.recursiveDelete(db.collection(name));
  const now = Timestamp.now(),
    pinHash = (
      await db.collection("participants").doc("person-0").get()
    ).data()!.pinHash;
  let batch = db.batch(),
    writes = 0;
  async function put(name: string, id: string, value: Record<string, unknown>) {
    batch.set(db.collection(name).doc(id), value);
    if (++writes === 400) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }
  await put("campaigns", fixtureCampaign, {
    name: `PILOTO FICTICIO · ${size} participantes`,
    status: "planning",
    locationName: "Lugar sintético",
    defaultCapacityPerBlock: 16,
    maxPointsDefault: 8,
    createdAt: now,
    updatedAt: now,
  });
  const selections = (person: number, block: number) => {
    if (person === 2) return block === 22;
    if (person === 20) return block === 23;
    if (size === 150) return true;
    const counts = [0, 1, 15, 16, 17, 35, 60, 75];
    return block === 0 || person < counts[block % 8];
  };
  const cookies: Record<number, string> = {},
    registrations: Record<number, string> = {};
  for (let index = 0; index < size; index++) {
    const id = `person-${index}`,
      token = newSessionToken();
    const reg = registrationId(fixtureCampaign, id);
    cookies[index] = token;
    registrations[index] = reg;
    await put("participants", id, {
      id,
      fullName:
        index < 2
          ? "Nombre repetido ficticio"
          : index === 3
            ? "Participante ficticio de nombre extenso María José de los Ángeles Pérez González"
            : `Participante ficticio ${String(index).padStart(3, "0")}`,
      congregationId: `cong-${index % 4}`,
      phoneNormalized: `+569${40000000 + index}`,
      pinHash,
      sessionVersion: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await put(
      "campaignParticipantPhones",
      privateKey(fixtureSecret, "phone", `+569${40000000 + index}`),
      { participantId: id },
    );
    await put("campaignRegistrations", reg, {
      id: reg,
      campaignId: fixtureCampaign,
      participantId: id,
      registrationStatus: "active",
      maxTurns: index % 4 === 0 ? null : (index % 3) + 1,
      createdAt: now,
      updatedAt: now,
    });
    await put("deviceSessions", tokenHash(token), {
      id: tokenHash(token),
      participantId: id,
      sessionVersion: 0,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + SESSION_SECONDS * 1000),
      revokedAt: null,
    });
  }
  for (let block = 0; block < 24; block++) {
    const day = Math.floor(block / 8),
      hour = 8 + (block % 8);
    await put("campaignDays", `day-${day}`, {
      campaignId: fixtureCampaign,
      date: ["2026-10-30", "2026-10-31", "2026-11-01"][day],
      label: `Jornada ${day + 1}`,
      sortOrder: day,
      active: true,
    });
    await put("timeBlocks", `block-${block}`, {
      campaignId: fixtureCampaign,
      campaignDayId: `day-${day}`,
      startTime: `${hour.toString().padStart(2, "0")}:00`,
      endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
      active: true,
      sortOrder: block,
      ...(block === 7 ? { capacityOverride: 0 } : {}),
    });
    const points = size === 150 ? 8 : [3, 4, 5, 8][block % 4];
    for (let point = 0; point < points; point++)
      await put(
        "blockPoints",
        blockPointId(`block-${block}`, `point-${point}`),
        {
          campaignId: fixtureCampaign,
          timeBlockId: `block-${block}`,
          pointId: `point-${point}`,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      );
    for (let person = 0; person < size; person++)
      if (selections(person, block))
        await put(
          "availabilities",
          availabilityId(registrations[person], `block-${block}`),
          {
            campaignId: fixtureCampaign,
            registrationId: registrations[person],
            timeBlockId: `block-${block}`,
            available: true,
            createdAt: now,
            updatedAt: now,
          },
        );
    // Complete points in the large seed; smaller seed retains coverage edge cases.
    const candidates = Array.from({ length: size }, (_, index) => index).filter(
      (index) => ![0, 1, 2, 20].includes(index) && selections(index, block),
    );
    const assigned =
      size === 150
        ? candidates.slice(0, 16)
        : block === 0
          ? [0, 1, ...candidates.slice(0, 2)]
          : candidates.slice(0, Math.min(points * 2, 4));
    for (const [slot, person] of assigned.entries())
      await put("campaignAssignments", `pilot-${block}-${slot}`, {
        id: `pilot-${block}-${slot}`,
        campaignId: fixtureCampaign,
        timeBlockId: `block-${block}`,
        pointId: `point-${Math.floor(slot / 2)}`,
        registrationId: registrations[person],
        slotNumber: (slot % 2) + 1,
        status: "draft",
        createdBy: "dashboard-organizer",
        createdAt: now,
        updatedAt: now,
        version: 1,
        availabilityOverride: false,
        maxTurnsOverride: true,
      });
  }
  for (const [id, first, second, status] of [
    ["accepted-normal", 0, 1, "accepted"],
    ["accepted-conflict", 2, 20, "accepted"],
    ["pending", 30, 31, "pending"],
    ["rejected", 32, 33, "rejected"],
  ] as const)
    await put("pairRequests", id, {
      id,
      campaignId: fixtureCampaign,
      requesterRegistrationId: registrations[first],
      recipientRegistrationId: registrations[second],
      status,
      createdAt: now,
      updatedAt: now,
    });
  if (writes) await batch.commit();
  return { ...credentials, cookies, registrations, size };
}
