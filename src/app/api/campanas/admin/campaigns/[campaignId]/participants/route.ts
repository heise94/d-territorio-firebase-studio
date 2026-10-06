import { NextRequest } from "next/server";
import {
  dashboardService,
  organizerToken,
  dashboardResponse,
  dashboardFailure,
  dashboardSearch,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const filters = Object.fromEntries(request.nextUrl.searchParams);
    return dashboardResponse(
      await dashboardService().participants(
        organizerToken(request),
        (await context.params).campaignId,
        {
          ...filters,
          ...(request.headers.has("X-Campaign-Search")
            ? { q: dashboardSearch(request) }
            : {}),
        },
      ),
    );
  } catch (error) {
    return dashboardFailure(error);
  }
}
