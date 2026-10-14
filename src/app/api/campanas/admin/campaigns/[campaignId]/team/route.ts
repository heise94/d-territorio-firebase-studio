import { NextRequest } from "next/server";
import { CampaignTeamService } from "@/modules/campaigns/server/campaign-team-service";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { dashboardFailure, dashboardResponse, organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = () => new CampaignTeamService(campaignsAdminDb());

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    return dashboardResponse(await service().view(organizerToken(request), (await context.params).campaignId,
      request.nextUrl.searchParams.get("q") ?? ""));
  } catch (error) { return dashboardFailure(error); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    return dashboardResponse(await service().change(organizerToken(request), (await context.params).campaignId,
      await request.json()));
  } catch (error) { return dashboardFailure(error); }
}
