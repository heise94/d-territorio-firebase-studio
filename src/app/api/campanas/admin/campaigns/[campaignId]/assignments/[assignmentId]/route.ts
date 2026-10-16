import { NextRequest } from "next/server";
import { changeAssignment } from "@/modules/campaigns/server/planner-service";
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
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; assignmentId: string }> },
) {
  try {
    const result = await changeAssignment(
      organizerToken(request),
      (await context.params).campaignId,
      (await context.params).assignmentId,
      await plannerBody(request),
    );
    return dashboardResponse(result ?? { saved: true });
  } catch (error) {
    return plannerFailure(error);
  }
}
