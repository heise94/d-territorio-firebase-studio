import { NextRequest } from "next/server";
import { getProgram } from "@/modules/campaigns/server/program-service";
import { programFailure } from "@/modules/campaigns/server/program-http";
import {
  dashboardResponse,
  organizerToken,
} from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    return dashboardResponse(
      await getProgram(
        organizerToken(request),
        (await context.params).campaignId,
        request.nextUrl.searchParams.has("version")
          ? Number(request.nextUrl.searchParams.get("version"))
          : undefined,
      ),
    );
  } catch (error) {
    return programFailure(error);
  }
}
