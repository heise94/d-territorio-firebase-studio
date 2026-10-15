import { NextRequest } from "next/server";
import { organizationResponse, organizationFailure, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string; blockId: string }> }) {
  try { const { campaignId, blockId } = await context.params; return organizationResponse({ participants: await organizationService().availableForBlock(organizationToken(request), campaignId, blockId) }); }
  catch (error) { return organizationFailure(error); }
}
