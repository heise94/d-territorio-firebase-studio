import { NextRequest } from "next/server";
import { organizationResponse, organizationFailure, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try { const { campaignId, registrationId } = await context.params; return organizationResponse(await organizationService().detail(organizationToken(request), campaignId, registrationId)); }
  catch (error) { return organizationFailure(error); }
}
