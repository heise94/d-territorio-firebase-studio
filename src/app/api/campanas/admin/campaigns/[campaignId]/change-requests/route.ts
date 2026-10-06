import { NextRequest } from "next/server";
import { adminChanges } from "@/modules/campaigns/server/change-request-admin";
import { programFailure } from "@/modules/campaigns/server/program-http";
import {
  organizerToken,
  dashboardResponse,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string; id?: string }> },
) {
  try {
    const { campaignId, id } = await context.params;
    return dashboardResponse(
      await adminChanges(organizerToken(request), campaignId, id),
    );
  } catch (error) {
    return programFailure(error);
  }
}
