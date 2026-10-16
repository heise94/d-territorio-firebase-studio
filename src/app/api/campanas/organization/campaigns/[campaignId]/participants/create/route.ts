import { NextRequest } from "next/server";
import { organizationResponse, organizationFailure, organizationService, organizationToken, organizationBody } from "@/modules/campaigns/server/organization-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { return organizationResponse(await organizationService().createParticipant(organizationToken(request), (await context.params).campaignId, await organizationBody(request))); }
  catch (error) { return organizationFailure(error); }
}
