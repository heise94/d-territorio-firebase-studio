import { NextRequest } from "next/server";
import {
  participantFailure,
  participantToken,
  privateResponse,
  registrationService,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ campaignId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    return privateResponse(
      await registrationService().view(
        participantToken(request),
        (await context.params).campaignId,
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    const body = await registrationBody(request);
    return privateResponse(
      await registrationService().save(
        participantToken(request),
        (await context.params).campaignId,
        body,
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
