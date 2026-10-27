import { NextRequest } from "next/server";
import { dashboardFailure, dashboardResponse, organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";
import { pairRequestService } from "@/modules/campaigns/server/pair-request-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
import { schedulePushDelivery } from "@/modules/campaigns/server/push-dispatch-after";
import { adminAcceptPairRequestSchema } from "@/modules/campaigns/schemas/admin-dashboard-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; registrationId: string }> },
) {
  try {
    const { campaignId, registrationId } = await context.params;
    const body = await registrationBody(request);
    const accepted = adminAcceptPairRequestSchema.safeParse(body);
    const result = accepted.success
      ? await pairRequestService().acceptByOrganizer(organizerToken(request), campaignId, registrationId, accepted.data.requestId)
      : await pairRequestService().createByOrganizer(organizerToken(request), campaignId, registrationId, body);
    schedulePushDelivery();
    return dashboardResponse(result);
  } catch (error) {
    return dashboardFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; registrationId: string }> },
) {
  try {
    const { campaignId, registrationId } = await context.params;
    const body = await registrationBody(request);
    const parsed = adminAcceptPairRequestSchema.pick({ requestId: true }).safeParse(body);
    if (!parsed.success) return dashboardResponse({ error: "Acuerdo inválido." }, 400);
    const result = await pairRequestService().removeAcceptedByOrganizer(
      organizerToken(request),
      campaignId,
      registrationId,
      parsed.data.requestId,
    );
    return dashboardResponse(result);
  } catch (error) {
    return dashboardFailure(error);
  }
}
