import { NextRequest } from "next/server";
import { organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, context: { params: Promise<{ campaignId: string; assignmentId: string }> }) {
  try { const { campaignId, assignmentId } = await context.params; await organizationService().changePlannerAssignment(organizationToken(request), campaignId, assignmentId, await registrationBody(request)); return organizationResponse({ ok: true }); }
  catch (error) { return organizationFailure(error); }
}
