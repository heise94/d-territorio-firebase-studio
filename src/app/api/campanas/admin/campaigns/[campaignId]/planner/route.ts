import { NextRequest } from "next/server";
import { getPlanner } from "@/modules/campaigns/server/planner-service";
import {
  plannerBody,
  plannerFailure,
} from "@/modules/campaigns/server/planner-http";
import {
  dashboardResponse,
  organizerToken,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const result = await getPlanner(
      organizerToken(request),
      (await context.params).campaignId,
      request.nextUrl.searchParams.get("blockId") ?? undefined,
    );
    return dashboardResponse(result ?? { saved: true });
  } catch (error) {
    return plannerFailure(error);
  }
}
