import { NextRequest } from "next/server";
import {
  dashboardService,
  organizerToken,
  dashboardResponse,
  dashboardFailure,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    return dashboardResponse(
      await dashboardService().overview(
        organizerToken(request),
        (await context.params).campaignId,
      ),
    );
  } catch (error) {
    return dashboardFailure(error);
  }
}
