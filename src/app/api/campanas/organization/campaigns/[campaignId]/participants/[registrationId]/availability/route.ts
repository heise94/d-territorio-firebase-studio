import { NextRequest } from "next/server";
import { organizationResponse, organizationFailure, organizationService, organizationToken, organizationBody } from "@/modules/campaigns/server/organization-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try { const { campaignId, registrationId } = await context.params; return organizationResponse(await organizationService().updateAvailability(organizationToken(request), campaignId, registrationId, await organizationBody(request))); }
  catch (error) { return organizationFailure(error); }
}
