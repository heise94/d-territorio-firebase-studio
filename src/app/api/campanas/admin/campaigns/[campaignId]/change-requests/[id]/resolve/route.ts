import { NextRequest } from "next/server";
import { schedulePushDelivery } from "@/modules/campaigns/server/push-dispatch-after";
import { resolveChange } from "@/modules/campaigns/server/change-request-admin";
import { programFailure } from "@/modules/campaigns/server/program-http";
import { plannerBody } from "@/modules/campaigns/server/planner-http";
import { operationalLog } from "@/modules/campaigns/server/operational-log";
import {
  organizerToken,
  dashboardResponse,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; id: string }> },
) {
  try {
    const { campaignId, id } = await context.params;
    const response = dashboardResponse(
      await resolveChange(
        organizerToken(request),
        campaignId,
        id,
        await plannerBody(request),
      ),
    );
    schedulePushDelivery();
    return response;
  } catch (error) {
    const response = programFailure(error);
    operationalLog("change", response.status);
    return response;
  }
}
