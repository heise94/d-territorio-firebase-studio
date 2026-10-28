import { NextRequest } from "next/server";
import { organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { const { campaignId } = await context.params; return organizationResponse(await organizationService().addManualPlannerPerson(organizationToken(request), campaignId, await registrationBody(request)), 201); }
  catch (error) { return organizationFailure(error); }
}
