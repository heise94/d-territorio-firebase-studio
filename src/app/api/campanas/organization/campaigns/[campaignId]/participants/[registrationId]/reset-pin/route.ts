import { NextRequest } from "next/server";
import { organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try {
    const { campaignId, registrationId } = await context.params;
    const input = await registrationBody(request) as { newPin?: unknown };
    if (!input || typeof input.newPin !== "string" || Object.keys(input).some((key) => key !== "newPin")) return organizationResponse({ error: "Datos inválidos." }, 400);
    return organizationResponse(await organizationService().resetParticipantPin(organizationToken(request), campaignId, registrationId, input.newPin));
  } catch (error) { return organizationFailure(error); }
}
