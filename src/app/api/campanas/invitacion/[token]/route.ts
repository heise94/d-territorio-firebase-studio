import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignCollections } from "@/modules/campaigns/lib/paths";
import { campaignsAdminDb, campaignsAdminApp } from "@/modules/campaigns/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const passwordSchema = z.object({ password: z.string().min(8).max(128) });
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }

async function invitation(token: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
  const ref = campaignsAdminDb().collection(campaignCollections.organizerInvitations).doc(hash(token));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const expires = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
  if (data.usedAt || !(expires instanceof Date) || expires.getTime() <= Date.now()) return null;
  return { ref, data };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const found = await invitation(token);
  if (!found) return json({ error: "El enlace no es válido o ya expiró." }, 404);
  const congregation = await campaignsAdminDb().collection(campaignCollections.congregations).doc(found.data.congregationId).get();
  const campaign = await campaignsAdminDb().collection(campaignCollections.campaigns).doc(found.data.campaignId).get();
  return json({ email: found.data.email, congregation: congregation.data()?.name ?? "", campaign: campaign.data()?.name ?? "" });
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const found = await invitation(token);
  if (!found) return json({ error: "El enlace no es válido o ya expiró." }, 404);
  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
  const auth = getAuth(campaignsAdminApp());
  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(found.data.email);
    return json({ error: "Ese correo ya tiene una cuenta. Inicia sesión o solicita al administrador que reasigne el acceso." }, 409);
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== "auth/user-not-found") return json({ error: "Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña." }, 409);
    user = await auth.createUser({ email: found.data.email, password: parsed.data.password, emailVerified: false, disabled: false });
    created = true;
  }
  try {
    const current = (user.customClaims ?? {}) as Record<string, unknown>;
    await auth.setCustomUserClaims(user.uid, { ...current, campaign_admin: true });
    const db = campaignsAdminDb();
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(found.ref);
      const data = fresh.data();
      if (!fresh.exists || data?.usedAt) throw new Error("INVITATION_USED");
      const grantId = `${found.data.campaignId}__${found.data.congregationId}__${user.uid}`;
      tx.set(db.collection(campaignCollections.organizerUsers).doc(grantId), {
        uid: user.uid,
        role: "CONGREGATION_RESPONSIBLE",
        active: true,
        campaignId: found.data.campaignId,
        congregationId: found.data.congregationId,
        email: found.data.email,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.update(found.ref, { usedAt: FieldValue.serverTimestamp(), activatedUid: user.uid });
    });
    return json({ ok: true, email: found.data.email });
  } catch (error) {
    if (created) await auth.deleteUser(user.uid).catch(() => undefined);
    if (error instanceof Error && error.message === "INVITATION_USED") return json({ error: "Esta invitación ya fue utilizada." }, 409);
    return json({ error: "No se pudo activar la cuenta." }, 503);
  }
}
