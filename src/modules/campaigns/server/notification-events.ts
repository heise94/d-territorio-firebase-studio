import "server-only";
import { createHash } from "node:crypto";
import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import type { InternalNotification } from "../domain/notification";
import { safeNotificationRoute } from "../domain/notification";
import { campaignCollections } from "../lib/paths";

export const notificationOutbox = "campaignNotificationOutbox";
export const pushDeliveries = "campaignPushDeliveries";
export const notificationEventId = (
  eventKey: string,
  type: string,
  participantId: string,
) =>
  createHash("sha256")
    .update(JSON.stringify([eventKey, type, participantId]))
    .digest("hex");

/** Called after all transaction reads. Domain event and internal history commit together.
 * Delivery is deliberately separate: no FCM/network call in a Firestore transaction. */
export function writeDomainNotification(
  tx: Transaction,
  db: Firestore,
  eventKey: string,
  participantId: string,
  campaignId: string,
  type: InternalNotification["type"],
  body: string,
  metadata: InternalNotification["metadata"],
  now: Timestamp,
  targetRoute = "/campanas/mi-programa",
  title = "Aviso de Campañas",
) {
  const id = notificationEventId(eventKey, type, participantId);
  const notification: InternalNotification = {
    id,
    participantId,
    campaignId,
    type,
    title,
    body,
    targetRoute: safeNotificationRoute(targetRoute),
    metadata,
    createdAt: now,
    readAt: null,
  };
  tx.create(
    db.collection(campaignCollections.notifications).doc(id),
    notification,
  );
  tx.create(db.collection(notificationOutbox).doc(id), {
    notificationId: id,
    participantId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
  return id;
}
