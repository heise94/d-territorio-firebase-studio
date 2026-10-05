import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { dispatchTurnReminders } from "@/modules/campaigns/server/turn-reminders";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(request: NextRequest) {
  const expected = process.env.CAMPAIGNS_NOTIFICATION_JOB_SECRET;
  if (!expected || expected.length < 32)
    return reply({ error: "Job no configurado." }, 503);
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(expected), hash(supplied)))
    return reply({ error: "No autorizado." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Body inválido." }, 400);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Body inválido." }, 400);
  let text = "",
    size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 256) {
      await reader.cancel();
      return reply({ error: "Body demasiado grande." }, 413);
    }
    text += new TextDecoder().decode(value);
  }
  try {
    if (!z.object({}).strict().safeParse(JSON.parse(text)).success)
      return reply({ error: "Body inválido." }, 400);
  } catch {
    return reply({ error: "Body inválido." }, 400);
  }
  try {
    const db = campaignsAdminDb(),
      ref = db.collection("campaignNotificationJobLocks").doc("dispatch"),
      now = new Date();
    const locked = await db.runTransaction(async (tx) => {
      const row = await tx.get(ref);
      if ((row.data()?.expiresAt?.toMillis() ?? 0) > now.getTime())
        return false;
      tx.set(ref, { expiresAt: Timestamp.fromMillis(now.getTime() + 60_000) });
      return true;
    });
    if (!locked)
      return reply(
        { error: "Job ejecutado recientemente. Reintenta en un minuto." },
        429,
      );
    return reply(await dispatchTurnReminders(now));
  } catch {
    return reply(
      { error: "El job no pudo terminar. Los avisos guardados se conservan." },
      503,
    );
  }
}
