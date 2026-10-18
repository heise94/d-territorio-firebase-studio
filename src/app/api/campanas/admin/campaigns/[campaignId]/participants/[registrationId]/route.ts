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
  context: { params: Promise<{ campaignId: string; registrationId: string }> },
) {
  try {
    const { campaignId, registrationId } = await context.params;
    return dashboardResponse(
      await dashboardService().detail(
        organizerToken(request),
        campaignId,
        registrationId,
      ),
    );
  } catch (error) {
    return dashboardFailure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; registrationId: string }> },
) {
  try {
    const { campaignId, registrationId } = await context.params;
    const body = await request.json();
    return dashboardResponse(
      await dashboardService().updateParticipantName(
        organizerToken(request),
        campaignId,
        registrationId,
        body,
      ),
    );
  } catch (error) {
    return dashboardFailure(error);
  }
}
