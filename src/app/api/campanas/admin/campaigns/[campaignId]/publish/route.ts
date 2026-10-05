import { NextRequest } from "next/server";
import { publishProgram } from "@/modules/campaigns/server/program-service";
import { programFailure } from "@/modules/campaigns/server/program-http";
import { plannerBody } from "@/modules/campaigns/server/planner-http";
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
    const body = await plannerBody(request);
    return dashboardResponse(
      await publishProgram(
        organizerToken(request),
        (await context.params).campaignId,
        body,
      ),
    );
  } catch (error) {
    return programFailure(error);
  }
}
