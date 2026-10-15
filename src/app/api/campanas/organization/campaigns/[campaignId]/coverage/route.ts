import { NextRequest } from "next/server";
import { organizationResponse, organizationFailure, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    return organizationResponse(await organizationService().coverageOverview(organizationToken(request), (await context.params).campaignId));
  } catch (error) {
    return organizationFailure(error);
  }
}
