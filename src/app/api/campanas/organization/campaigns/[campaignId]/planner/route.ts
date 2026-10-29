import { NextRequest } from "next/server";
import { organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { const { campaignId } = await context.params; return organizationResponse(await organizationService().planner(organizationToken(request), campaignId, request.nextUrl.searchParams.get("dayId") ?? undefined)); }
  catch (error) { return organizationFailure(error); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try { const { campaignId } = await context.params; await organizationService().assignPlanner(organizationToken(request), campaignId, await registrationBody(request)); return organizationResponse({ ok: true }); }
  catch (error) { return organizationFailure(error); }
}
