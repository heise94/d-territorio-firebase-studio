import { NextRequest } from "next/server";
import { z } from "zod";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { CongregationReviewService } from "@/modules/campaigns/server/congregation-review-service";
import { organizerToken, dashboardFailure, dashboardResponse } from "@/modules/campaigns/server/admin-dashboard-http";

export const runtime = "nodejs";
const schema = z.object({ status: z.enum(["approved", "not_approved"]) }).strict();
export async function PATCH(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) return dashboardResponse({ error: "Datos de revisión inválidos." }, 400);
    const { campaignId, registrationId } = await context.params;
    return dashboardResponse(await new CongregationReviewService(campaignsAdminDb()).review(
      organizerToken(request), campaignId, registrationId, body.data.status,
    ));
  } catch (error) { return dashboardFailure(error); }
}
