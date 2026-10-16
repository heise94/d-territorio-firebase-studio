import { NextRequest } from "next/server";
import { schedulePushDelivery } from "@/modules/campaigns/server/push-dispatch-after";
import {
  participantFailure,
  participantToken,
  privateResponse,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
import { pairRequestService } from "@/modules/campaigns/server/pair-request-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ campaignId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    return privateResponse(
      await pairRequestService().view(
        participantToken(request),
        (await context.params).campaignId,
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const response = privateResponse(
      await pairRequestService().mutate(
        participantToken(request),
        (await context.params).campaignId,
        await registrationBody(request),
      ),
    );
    schedulePushDelivery();
    return response;
  } catch (error) {
    return participantFailure(error);
  }
}
