import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { campaignCollections } from "@/modules/campaigns/lib/paths";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { requireCampaignAccess } from "@/modules/campaigns/server/campaign-access";
import { organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";
import { AuthError } from "@/modules/campaigns/server/auth/service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSchema = z.object({
  email: z.string().trim().email().max(254),
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
}

function failure(error: unknown) {
  if (error instanceof AuthError) return json({ error: error.message }, error.status);
  return json({ error: "No se pudo gestionar la invitación." }, 503);
}

async function authorize(request: NextRequest, campaignId: string) {
  return requireCampaignAccess(campaignsAdminDb(), organizerToken(request), campaignId, [
    "SUPER_ADMIN",
    "CAMPAIGN_ADMIN",
  ]);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; congregationId: string }> },
) {
  try {
    const { campaignId, congregationId } = await context.params;
    await authorize(request, campaignId);
    const db = campaignsAdminDb();
    const [invitations, grants] = await Promise.all([
      db.collection(campaignCollections.organizerInvitations)
        .where("campaignId", "==", campaignId)
        .where("congregationId", "==", congregationId)
        .get(),
      db.collection(campaignCollections.organizerUsers)
        .where("campaignId", "==", campaignId)
        .where("congregationId", "==", congregationId)
        .get(),
    ]);
    return json({
      invitations: invitations.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          status: data.usedAt ? "active" : new Date(data.expiresAt?.toDate?.() ?? data.expiresAt).getTime() < Date.now() ? "expired" : "pending",
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
      }),
      responsibleCount: grants.docs.filter((doc) => doc.data().active === true).length,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; congregationId: string }> },
) {
  try {
    const { campaignId, congregationId } = await context.params;
    const access = await authorize(request, campaignId);
    const parsed = emailSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Introduce un correo válido." }, 400);
    const email = parsed.data.email.toLowerCase();
    const db = campaignsAdminDb();
    const link = await db.collection(campaignCollections.campaignCongregations)
      .where("campaignId", "==", campaignId)
      .where("congregationId", "==", congregationId)
      .limit(1).get();
    if (link.empty) return json({ error: "La congregación no está asociada a esta campaña." }, 404);
    const existing = await db.collection(campaignCollections.organizerInvitations)
      .where("campaignId", "==", campaignId)
      .where("congregationId", "==", congregationId)
      .where("email", "==", email)
      .where("usedAt", "==", null)
      .limit(1).get();
    if (!existing.empty) return json({ error: "Ya existe una invitación pendiente para ese correo." }, 409);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.collection(campaignCollections.organizerInvitations).doc(tokenHash).set({
      email,
      campaignId,
      congregationId,
      createdBy: access.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      usedAt: null,
    });
    const linkUrl = new URL(`/campanas/invitacion/${token}`, request.url).toString();
    return json({ email, link: linkUrl, expiresInDays: 7 }, 201);
  } catch (error) {
    return failure(error);
  }
}
