import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getCurrentParticipant } from "@/modules/campaigns/server/auth/session";
import { AuthError } from "@/modules/campaigns/server/auth/service";
import {
  participantCampaignAdminAccess,
} from "@/modules/campaigns/server/campaign-access";
import { campaignsAdminApp, campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const expected =
    process.env.CAMPAIGNS_APP_ORIGIN ??
    (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : undefined);
  if (!expected || request.headers.get("origin") !== expected)
    throw new AuthError(403, "Solicitud no permitida.");
}

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const participant = await getCurrentParticipant();
    if (!participant || participant.mustChangePin)
      throw new AuthError(401, "Ingresa con tu teléfono y PIN para continuar.");
    const access = await participantCampaignAdminAccess(
      campaignsAdminDb(),
      participant.id,
    );
    if (!access)
      throw new AuthError(403, "Tu cuenta no tiene acceso a la administración de una campaña.");
    // No email or password is created. Firebase Auth receives only this
    // short-lived, server-signed custom token after the participant session.
    const token = await getAuth(campaignsAdminApp()).createCustomToken(
      participant.id,
      {
        campaign_admin: true,
        campaign_participant_admin: !access.superAdmin,
        campaign_ids: [access.campaignId],
        ...(access.superAdmin ? { super_admin: true } : {}),
      },
    );
    return NextResponse.json(
      { token, campaignId: access.campaignId },
      { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 503;
    const message =
      error instanceof AuthError
        ? error.message
        : "No se pudo abrir la administración. Intenta nuevamente.";
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  }
}
