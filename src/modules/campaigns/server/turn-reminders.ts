import "server-only";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { ProgramVersion } from "../domain/program";
import { campaignsAdminDb } from "./firebase-admin";
import { campaignCollections as names } from "../lib/paths";
import {
  notificationEventId,
  writeDomainNotification,
} from "./notification-events";
import { dispatchPushOutbox, type PushDeliveryService } from "./push-delivery";

/** Interpret domain wall time in an explicit IANA zone, including Chile DST.
 * Reject nonexistent/ambiguous wall times rather than silently shifting a turn. */
export function campaignTurnInstant(
  date: string,
  time: string,
  zone: string,
): Date {
  const target = date + "T" + time;
  const nominal = Date.parse(target + ":00Z");
  if (!Number.isFinite(nominal)) throw new Error("Invalid campaign time");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches: number[] = [];
  // Offsets range -14..+14 hours, with 15-minute resolution for current IANA zones.
  for (let offset = -56; offset <= 56; offset++) {
    const instant = nominal + offset * 15 * 60_000;
    const p = Object.fromEntries(
      formatter.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    if (
      p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute ===
      target
    )
      matches.push(instant);
  }
  if (matches.length !== 1)
    throw new Error("Ambiguous or nonexistent campaign time");
  return new Date(matches[0]);
}
export async function dispatchTurnReminders(
  now: Date,
  options: {
    db?: Firestore;
    sender?: PushDeliveryService;
    timeZone?: string;
    leadHours?: number;
    windowMinutes?: number;
  } = {},
) {
  if (!Number.isFinite(now.getTime()))
    throw new Error("Invalid reminder clock");
  const db = options.db ?? campaignsAdminDb(),
    zone =
      options.timeZone ?? process.env.CAMPAIGNS_TIME_ZONE ?? "America/Santiago";
  const lead = options.leadHours ?? 24,
    window = options.windowMinutes ?? 60;
  if (
    !Number.isFinite(lead) ||
    lead <= 0 ||
    !Number.isFinite(window) ||
    window <= 0 ||
    window > 1440
  )
    throw new Error("Invalid reminder window");
  const campaigns = await db
    .collection(names.campaigns)
    .where("status", "==", "published")
    .get();
  let created = 0,
    invalidTimes = 0;
  for (const campaign of campaigns.docs) {
    const result = await db.runTransaction(async (tx) => {
      const current = await tx.get(campaign.ref);
      if (
        current.data()?.status !== "published" ||
        !current.data()?.currentProgramVersionId
      )
        return { created: 0, invalid: 0 };
      const row = await tx.get(
        db
          .collection(names.programVersions)
          .doc(current.data()!.currentProgramVersionId),
      );
      const version = row.data() as ProgramVersion | undefined;
      if (
        !version ||
        version.campaignId !== campaign.id ||
        version.status !== "published"
      )
        return { created: 0, invalid: 0 };
      const events = [];
      const eventIds = new Set<string>();
      let invalid = 0;
      for (const day of version.snapshot.days)
        for (const block of day.blocks) {
          let instant: Date;
          try {
            instant = campaignTurnInstant(
              day.date,
              block.startTime,
              current.data()?.timeZone ?? zone,
            );
          } catch {
            invalid++;
            continue;
          }
          const delay = instant.getTime() - now.getTime();
          if (delay < (lead * 60 - window) * 60_000 || delay > lead * 3_600_000)
            continue;
          for (const cell of block.cells)
            for (const person of cell.slots) {
              if (!person) continue;
              const assignment = await tx.get(
                db.collection(names.assignments).doc(person.assignmentId),
              );
              const registration = await tx.get(
                db
                  .collection(names.campaignRegistrations)
                  .doc(person.registrationId),
              );
              const participantId = registration.data()?.participantId;
              if (
                !participantId ||
                registration.data()?.registrationStatus !== "active" ||
                assignment.data()?.status !== "published" ||
                assignment.data()?.registrationId !== person.registrationId ||
                assignment.data()?.timeBlockId !== block.id ||
                assignment.data()?.pointId !== cell.pointId ||
                assignment.data()?.campaignId !== campaign.id
              )
                continue;
              const profile = await tx.get(
                db.collection(names.participants).doc(participantId),
              );
              if (profile.data()?.active !== true) continue;
              // Assignment identity persists across unchanged snapshots: v2 doesn't remind unchanged v1 twice.
              const eventKey =
                "turn-reminder:" + campaign.id + ":" + person.assignmentId;
              const id = notificationEventId(
                eventKey,
                "turn_reminder",
                participantId,
              );
              if (eventIds.has(id)) continue;
              eventIds.add(id);
              if (
                (await tx.get(db.collection(names.notifications).doc(id)))
                  .exists
              )
                continue;
              events.push({
                eventKey,
                participantId,
                assignmentId: person.assignmentId,
              });
            }
        }
      for (const event of events)
        writeDomainNotification(
          tx,
          db,
          event.eventKey,
          event.participantId,
          campaign.id,
          "turn_reminder",
          "Tienes un turno próximo. Revisa tu programa.",
          { version: version.version, assignmentId: event.assignmentId },
          Timestamp.fromDate(now),
          "/campanas/mi-programa",
          "Recordatorio de turno",
        );
      return { created: events.length, invalid };
    });
    created += result.created;
    invalidTimes += result.invalid;
  }
  const delivery = await dispatchPushOutbox({
    db,
    sender: options.sender,
    now,
  });
  return { created, invalidTimes, delivery };
}
