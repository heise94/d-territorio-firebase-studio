import { NextRequest } from "next/server";
import { dashboardFailure, dashboardResponse, organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";
import { pairRequestService } from "@/modules/campaigns/server/pair-request-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
import { schedulePushDelivery } from "@/modules/campaigns/server/push-dispatch-after";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; registrationId: string }> },
) {
  try {
    const { campaignId, registrationId } = await context.params;
    const result = await pairRequestService().createByOrganizer(
      organizerToken(request),
      campaignId,
      registrationId,
      await registrationBody(request),
    );
    schedulePushDelivery();
    return dashboardResponse(result);
  } catch (error) {
    return dashboardFailure(error);
  }
}
