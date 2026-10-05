import { NextRequest } from "next/server";
import { createAssignment } from "@/modules/campaigns/server/planner-service";
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
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const result = await createAssignment(
      organizerToken(request),
      (await context.params).campaignId,
      await plannerBody(request),
    );
    return dashboardResponse(result ?? { saved: true });
  } catch (error) {
    return plannerFailure(error);
  }
}
