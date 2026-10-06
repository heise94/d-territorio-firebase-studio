import "server-only";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import type { InternalNotification } from "../domain/notification";
import { safeNotificationRoute } from "../domain/notification";
import { campaignCollections as names } from "../lib/paths";
import { campaignsAdminDb } from "./firebase-admin";
import { participantAuth } from "./auth/session";
import { AuthError } from "./auth/service";

const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(25),
    cursor: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const readSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("one"),
      id: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z.object({ action: z.literal("all") }).strict(),
]);
export async function notificationsPage(token: string, input: unknown = {}) {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) throw new AuthError(400, "Consulta de avisos inválida.");
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, person) => {
      const rows = await tx.get(
        campaignsAdminDb()
          .collection(names.notifications)
          .where("participantId", "==", person.id),
      );
      const sorted = rows.docs
        .map((d) => ({ ...d.data(), id: d.id }) as InternalNotification)
        .sort(
          (a, b) =>
            Number(!!a.readAt) - Number(!!b.readAt) ||
            b.createdAt.toMillis() - a.createdAt.toMillis() ||
            a.id.localeCompare(b.id),
        );
      const index = parsed.data.cursor
        ? sorted.findIndex((n) => n.id === parsed.data.cursor)
        : -1;
      if (parsed.data.cursor && index < 0)
        throw new AuthError(400, "Actualiza el listado de avisos.");
      const offset = index + 1,
        page = sorted.slice(offset, offset + parsed.data.limit);
      return {
        unreadCount: sorted.filter((n) => !n.readAt).length,
        notifications: page.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          targetRoute: safeNotificationRoute(n.targetRoute),
          createdAt: n.createdAt.toDate().toISOString(),
          readAt: n.readAt?.toDate().toISOString() ?? null,
        })),
        nextCursor:
          offset + page.length < sorted.length
            ? (page.at(-1)?.id ?? null)
            : null,
      };
    },
  );
}
export async function markNotificationsRead(token: string, input: unknown) {
  const parsed = readSchema.safeParse(input);
  if (!parsed.success) throw new AuthError(400, "Acción de avisos inválida.");
  const auth = participantAuth(),
    current = await auth.current(token);
  if (!current)
    throw new AuthError(401, "Tu sesión venció. Ingresa nuevamente.");
  await auth.limit("notifications-read", current.participant.id, 60);
  // A bounded page per transaction avoids Firestore's 500-write limit; all is
  // repeated until no unread entries remain, without deleting historical events.
  let updated = 0;
  do {
    const count = await auth.withParticipantTransaction(
      token,
      async (tx, person) => {
        const db = campaignsAdminDb(),
          now = Timestamp.now();
        if (parsed.data.action === "one") {
          const ref = db.collection(names.notifications).doc(parsed.data.id),
            row = await tx.get(ref);
          if (!row.exists || row.data()?.participantId !== person.id)
            throw new AuthError(404, "Aviso no disponible.");
          if (row.data()?.readAt) return 0;
          tx.update(ref, { readAt: now });
          return 1;
        }
        const rows = await tx.get(
          db
            .collection(names.notifications)
            .where("participantId", "==", person.id),
        );
        const unread = rows.docs.filter((d) => !d.data().readAt).slice(0, 400);
        unread.forEach((d) => tx.update(d.ref, { readAt: now }));
        return unread.length;
      },
    );
    updated += count;
    if (parsed.data.action === "one" || count < 400) break;
  } while (true);
  return { updated };
}
