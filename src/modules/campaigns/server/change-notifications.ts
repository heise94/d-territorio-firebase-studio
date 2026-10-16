import "server-only";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import type { InternalNotification } from "../domain/change-request";
import type { ProgramSnapshot } from "../domain/program";
import { campaignCollections as names } from "../lib/paths";
import { campaignsAdminDb } from "./firebase-admin";
import { participantAuth } from "./auth/session";
import { snapshotTurns } from "./change-request-context";
import { writeDomainNotification } from "./notification-events";

export function writeNotification(
  tx: Transaction,
  eventKey: string,
  participantId: string,
  campaignId: string,
  type: InternalNotification["type"],
  body: string,
  metadata: InternalNotification["metadata"],
  now: Timestamp,
) {
  writeDomainNotification(
    tx,
    campaignsAdminDb(),
    eventKey,
    participantId,
    campaignId,
    type,
    body,
    metadata,
    now,
    "/campanas/mi-programa",
    type === "assignment_changed"
      ? "Tu programa fue actualizado"
      : "Solicitud de cambio",
  );
}
/** Compare each person's entire presentation, including their companion, never notify the campaign wholesale. */
export function affectedRegistrations(
  previous: ProgramSnapshot,
  next: ProgramSnapshot,
) {
  const signatures = (snapshot: ProgramSnapshot) => {
    const result = new Map<string, string[]>();
    for (const t of snapshotTurns(snapshot)) {
      const rows = result.get(t.person.registrationId) ?? [];
      const point = t.day.points.find((p) => p.id === t.cell.pointId)!;
      rows.push(
        JSON.stringify([
          t.day.date,
          t.block.startTime,
          t.block.endTime,
          point,
          t.cell.slots[t.slotNumber === 1 ? 1 : 0]?.registrationId ?? null,
          t.cell.slots[t.slotNumber === 1 ? 1 : 0]?.fullName ?? null,
        ]),
      );
      result.set(t.person.registrationId, rows);
    }
    return new Map(
      [...result].map(([id, rows]) => [id, JSON.stringify(rows.sort())]),
    );
  };
  const a = signatures(previous),
    b = signatures(next);
  return [...new Set([...a.keys(), ...b.keys()])].filter(
    (id) => a.get(id) !== b.get(id),
  );
}
export async function participantNotifications(token: string) {
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, participant) => {
      const rows = await tx.get(
        campaignsAdminDb()
          .collection(names.notifications)
          .where("participantId", "==", participant.id),
      );
      // This existing endpoint remains the focused F8 change-alert projection.
      // The complete center reads the same collection, including new F9 events.
      const notices = rows.docs
        .map((d) => d.data() as InternalNotification)
        .filter((n) =>
          [
            "assignment_changed",
            "change_request_approved",
            "change_request_rejected",
            "change_request_resolved",
          ].includes(n.type),
        );
      const terminalRequests = new Set(
        notices
          .filter(
            (n) =>
              n.type === "change_request_resolved" ||
              n.type === "change_request_rejected",
          )
          .map((n) => n.metadata.requestId),
      );
      // Preserve every persisted event, but do not present an obsolete approval
      // as if a request that has already finished were still being managed.
      return notices
        .filter(
          (n) =>
            n.type !== "change_request_approved" ||
            !terminalRequests.has(n.metadata.requestId),
        )
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 20)
        .map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          targetRoute: n.targetRoute,
          createdAt: n.createdAt.toDate().toISOString(),
          readAt: n.readAt?.toDate().toISOString() ?? null,
        }));
    },
  );
}
