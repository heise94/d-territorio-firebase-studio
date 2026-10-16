import { NextRequest } from "next/server";
import { organizationBody, organizationFailure, organizationResponse, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try {
    const { campaignId, registrationId } = await context.params;
    return organizationResponse(await organizationService().setPartner(organizationToken(request), campaignId, registrationId, await organizationBody(request)));
  } catch (error) { return organizationFailure(error); }
}
