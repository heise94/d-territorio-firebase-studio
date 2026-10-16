import { NextRequest } from "next/server";
import { programHistory } from "@/modules/campaigns/server/program-history";
import { programFailure } from "@/modules/campaigns/server/program-http";
import {
  organizerToken,
  dashboardResponse,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    return dashboardResponse(
      await programHistory(
        organizerToken(request),
        (await context.params).campaignId,
      ),
    );
  } catch (error) {
    return programFailure(error);
  }
}
