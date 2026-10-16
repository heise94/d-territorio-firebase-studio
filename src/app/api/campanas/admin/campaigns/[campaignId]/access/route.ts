import { NextRequest } from "next/server";
import { campaignAccessForNavigation } from "@/modules/campaigns/server/campaign-access";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { organizerToken, dashboardFailure, dashboardResponse } from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { const access = await campaignAccessForNavigation(campaignsAdminDb(), organizerToken(request), (await context.params).campaignId); return dashboardResponse({ role: access.role }); }
  catch (error) { return dashboardFailure(error); }
}
