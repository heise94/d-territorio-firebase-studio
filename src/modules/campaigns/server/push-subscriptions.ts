import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignsAdminDb } from "./firebase-admin";
import { participantAuth } from "./auth/session";
import { tokenHash } from "./auth/crypto";
import { AuthError } from "./auth/service";
import { campaignCollections as names } from "../lib/paths";

const subscribeSchema = z
  .object({
    fcmToken: z
      .string()
      .min(20)
      .max(4096)
      .regex(/^[A-Za-z0-9:_-]+$/),
    platform: z
      .enum(["android", "ios", "desktop", "unknown"])
      .default("unknown"),
  })
  .strict();
const emptySchema = z.object({}).strict();
export async function pushStatus(token: string) {
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, person) => {
      const rows = await tx.get(
        campaignsAdminDb()
          .collection(names.pushSubscriptions)
          .where("sessionRef", "==", tokenHash(token)),
      );
      return {
        enabled: rows.docs.some(
          (d) =>
            d.data().participantId === person.id && d.data().enabled === true,
        ),
      };
    },
  );
}
export async function subscribePush(token: string, input: unknown) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) throw new AuthError(400, "Suscripción inválida.");
  const auth = participantAuth(),
    current = await auth.current(token);
  if (!current)
    throw new AuthError(401, "Tu sesión venció. Ingresa nuevamente.");
  await auth.limit("push-subscribe", current.participant.id, 30);
  return auth.withParticipantTransaction(token, async (tx, person) => {
    const db = campaignsAdminDb(),
      sid = tokenHash(token),
      now = Timestamp.now();
    const hash = createHash("sha256")
      .update(parsed.data.fcmToken)
      .digest("hex");
    const ref = db.collection(names.pushSubscriptions).doc(hash),
      prior = await tx.get(ref);
    const previous = await tx.get(
      db.collection(names.pushSubscriptions).where("sessionRef", "==", sid),
    );
    if (prior.exists && prior.data()?.participantId !== person.id) {
      const oldSession = await tx.get(
        db.collection(names.deviceSessions).doc(prior.data()!.sessionRef),
      );
      const oldParticipant = await tx.get(
        db.collection(names.participants).doc(prior.data()!.participantId),
      );
      if (
        prior.data()?.enabled &&
        oldSession.exists &&
        oldParticipant.data()?.active === true &&
        oldSession.data()?.sessionVersion ===
          (oldParticipant.data()?.sessionVersion ?? 0) &&
        !oldSession.data()?.revokedAt &&
        oldSession.data()!.expiresAt.toMillis() > Date.now()
      )
        throw new AuthError(
          409,
          "Este dispositivo está vinculado a otra sesión. Cierra esa sesión primero.",
        );
    }
    previous.docs
      .filter((d) => d.id !== hash && d.data().participantId === person.id)
      .forEach((d) =>
        tx.update(d.ref, { enabled: false, disabledAt: now, updatedAt: now }),
      );
    tx.set(ref, {
      id: hash,
      participantId: person.id,
      sessionRef: sid,
      fcmToken: parsed.data.fcmToken,
      tokenHash: hash,
      platform: parsed.data.platform,
      enabled: true,
      createdAt: prior.data()?.createdAt ?? now,
      updatedAt: now,
      lastSeenAt: now,
    });
    return { enabled: true };
  });
}
export async function unsubscribePush(token: string, input: unknown) {
  if (!emptySchema.safeParse(input).success)
    throw new AuthError(400, "Acción inválida.");
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, person) => {
      const rows = await tx.get(
        campaignsAdminDb()
          .collection(names.pushSubscriptions)
          .where("sessionRef", "==", tokenHash(token)),
      );
      const now = Timestamp.now();
      rows.docs
        .filter((d) => d.data().participantId === person.id)
        .forEach((d) =>
          tx.update(d.ref, { enabled: false, disabledAt: now, updatedAt: now }),
        );
      return { enabled: false };
    },
  );
}
