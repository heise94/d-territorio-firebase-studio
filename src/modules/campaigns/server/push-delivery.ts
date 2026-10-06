import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getMessaging } from "firebase-admin/messaging";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { campaignsAdminApp, campaignsAdminDb } from "./firebase-admin";
import { campaignCollections as names } from "../lib/paths";
import { notificationOutbox, pushDeliveries } from "./notification-events";
import type {
  CampaignPushSubscription,
  InternalNotification,
} from "../domain/notification";
import { safeNotificationRoute } from "../domain/notification";
import { operationalLog } from "./operational-log";

export interface PushDeliveryService {
  send(
    token: string,
    payload: {
      title: string;
      body: string;
      targetRoute: string;
      type: string;
      eventId: string;
    },
  ): Promise<void>;
}
export const fcmPushSender: PushDeliveryService = {
  async send(token, payload) {
    await getMessaging(campaignsAdminApp()).send({
      token,
      data: payload,
      webpush: { headers: { TTL: "3600", Urgency: "normal" } },
    });
  },
};
export const maximumPushAttempts = 5;
const permanentCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);
const safeErrorCode = (error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && /^messaging\/[a-z-]+$/.test(code)
    ? code
    : "messaging/transient-error";
};
const payload = (n: InternalNotification) => ({
  title: "D-Territorio Campañas",
  body:
    n.type === "turn_reminder"
      ? "Tienes un turno próximo. Revisa la aplicación."
      : "Tienes un aviso nuevo. Revisa la aplicación.",
  targetRoute: safeNotificationRoute(n.targetRoute),
  type: n.type,
  eventId: n.id,
});

/** Bounded dispatcher. Claims each event/device before sending externally.
 * FCM remains best-effort; the internal notification is never rolled back/deleted. */
export async function dispatchPushOutbox(
  options: {
    now?: Date;
    db?: Firestore;
    sender?: PushDeliveryService;
    limit?: number;
  } = {},
) {
  const db = options.db ?? campaignsAdminDb(),
    now = options.now ?? new Date();
  const sender = options.sender ?? fcmPushSender,
    limit = Math.min(50, Math.max(1, options.limit ?? 25));
  const stamp = Timestamp.fromDate(now);
  const rows = await db
    .collection(notificationOutbox)
    .where("status", "==", "pending")
    .get();
  let delivered = 0,
    failed = 0,
    skipped = 0;
  const pending = rows.docs
    .filter((d) => d.data().nextAttemptAt.toMillis() <= now.getTime())
    .slice(0, limit);
  for (const row of pending) {
    const notification = (
      await db.collection(names.notifications).doc(row.id).get()
    ).data() as InternalNotification | undefined;
    if (!notification) {
      await row.ref.update({
        status: "skipped",
        lastErrorCode: "missing-notification",
      });
      skipped++;
      continue;
    }
    const subscriptions = await db
      .collection(names.pushSubscriptions)
      .where("participantId", "==", notification.participantId)
      .get();
    let outstanding = false;
    for (const doc of subscriptions.docs.filter(
      (d) => d.data().enabled === true,
    )) {
      const key = createHash("sha256")
        .update(JSON.stringify([row.id, doc.data().sessionRef]))
        .digest("hex");
      const deliveryRef = db.collection(pushDeliveries).doc(key),
        lease = randomUUID();
      const claim = await db.runTransaction(async (tx) => {
        const subRow = await tx.get(doc.ref),
          old = await tx.get(deliveryRef);
        const sub = subRow.data() as CampaignPushSubscription | undefined;
        if (!sub?.enabled || sub.participantId !== notification.participantId)
          return null;
        const session = await tx.get(
          db.collection(names.deviceSessions).doc(sub.sessionRef),
        );
        const person = await tx.get(
          db.collection(names.participants).doc(sub.participantId),
        );
        if (notification.type === "turn_reminder") {
          const assignment = notification.metadata.assignmentId
            ? await tx.get(
                db
                  .collection(names.assignments)
                  .doc(notification.metadata.assignmentId),
              )
            : null;
          const campaign = await tx.get(
            db.collection(names.campaigns).doc(notification.campaignId),
          );
          const official = campaign.data()?.currentProgramVersionId
            ? await tx.get(
                db
                  .collection(names.programVersions)
                  .doc(campaign.data()!.currentProgramVersionId),
              )
            : null;
          const registration = assignment?.data()?.registrationId
            ? await tx.get(
                db
                  .collection(names.campaignRegistrations)
                  .doc(assignment.data()!.registrationId),
              )
            : null;
          const snapshot = official?.data()?.snapshot as
            | import("../domain/program").ProgramSnapshot
            | undefined;
          if (
            campaign.data()?.status !== "published" ||
            assignment?.data()?.status !== "published" ||
            registration?.data()?.registrationStatus !== "active" ||
            registration?.data()?.participantId !== sub.participantId ||
            !snapshot?.days.some((day) =>
              day.blocks.some((block) =>
                block.cells.some((cell) =>
                  cell.slots.some(
                    (slot) =>
                      slot?.assignmentId === notification.metadata.assignmentId,
                  ),
                ),
              ),
            )
          )
            return null;
        }
        if (
          !session.exists ||
          session.data()?.revokedAt ||
          session.data()!.expiresAt.toMillis() <= now.getTime() ||
          session.data()?.participantId !== sub.participantId ||
          person.data()?.active !== true ||
          person.data()?.sessionVersion !== session.data()?.sessionVersion
        ) {
          tx.update(doc.ref, {
            enabled: false,
            disabledAt: stamp,
            updatedAt: stamp,
          });
          return null;
        }
        const data = old.data();
        if (data && ["delivered", "failed", "skipped"].includes(data.status))
          return null;
        if (
          data &&
          ((data.leaseUntil?.toMillis() ?? 0) > now.getTime() ||
            (data.nextAttemptAt?.toMillis() ?? 0) > now.getTime())
        )
          return { waiting: true as const };
        const attempts = (data?.attempts ?? 0) + 1;
        if (attempts > maximumPushAttempts) {
          tx.set(deliveryRef, { ...data, status: "failed", leaseUntil: stamp });
          return null;
        }
        tx.set(deliveryRef, {
          notificationId: row.id,
          subscriptionId: doc.id,
          participantId: sub.participantId,
          status: "sending",
          attempts,
          lease,
          leaseUntil: Timestamp.fromMillis(now.getTime() + 120_000),
          createdAt: data?.createdAt ?? stamp,
          nextAttemptAt: stamp,
        });
        return { waiting: false as const, sub, attempts };
      });
      if (!claim) continue;
      if (claim.waiting) {
        outstanding = true;
        continue;
      }
      let code: string | null = null;
      try {
        await sender.send(claim.sub.fcmToken, payload(notification));
      } catch (error) {
        code = safeErrorCode(error);
      }
      const permanent = code !== null && permanentCodes.has(code);
      const retry =
        code !== null && !permanent && claim.attempts < maximumPushAttempts;
      await db.runTransaction(async (tx) => {
        const current = await tx.get(deliveryRef),
          sub = await tx.get(doc.ref);
        if (current.data()?.lease !== lease) return;
        tx.update(deliveryRef, {
          status: code === null ? "delivered" : retry ? "pending" : "failed",
          lastErrorCode: code,
          deliveredAt: code === null ? stamp : null,
          leaseUntil: stamp,
          nextAttemptAt: Timestamp.fromMillis(
            now.getTime() +
              Math.min(3_600_000, 60_000 * 2 ** (claim.attempts - 1)),
          ),
        });
        if (permanent && sub.data()?.tokenHash === claim.sub.tokenHash)
          tx.update(doc.ref, {
            enabled: false,
            disabledAt: stamp,
            updatedAt: stamp,
          });
      });
      if (code) failed++;
      else delivered++;
      outstanding ||= retry;
    }
    // A delivery lease/retry keeps the event open; terminal device rows are never resent.
    await row.ref.update({
      status: outstanding ? "pending" : "delivered",
      nextAttemptAt: Timestamp.fromMillis(now.getTime() + 60_000),
      deliveredAt: outstanding ? null : stamp,
    });
  }
  operationalLog("push", failed ? 503 : 200, { delivered, failed, skipped });
  return { delivered, failed, skipped, processed: pending.length };
}
