import { NextRequest } from "next/server";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { CongregationReviewService } from "@/modules/campaigns/server/congregation-review-service";
import { organizerToken, dashboardFailure, dashboardResponse } from "@/modules/campaigns/server/admin-dashboard-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const service = () => new CongregationReviewService(campaignsAdminDb());

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    return dashboardResponse(await service().list(
      organizerToken(request), (await context.params).campaignId,
      status as "pending" | "approved" | "not_approved" | undefined,
    ));
  } catch (error) { return dashboardFailure(error); }
}
