import { NextRequest } from "next/server";
import { organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { return organizationResponse(await organizationService().draftProgram(organizationToken(request), (await context.params).campaignId)); }
  catch (error) { return organizationFailure(error); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { return organizationResponse(await organizationService().publishDraft(organizationToken(request), (await context.params).campaignId, await registrationBody(request))); }
  catch (error) { return organizationFailure(error); }
}
