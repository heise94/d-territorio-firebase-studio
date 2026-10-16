import { NextRequest } from "next/server";
import {
  participantFailure,
  participantToken,
  privateResponse,
} from "@/modules/campaigns/server/participant-http";
import { pairRequestService } from "@/modules/campaigns/server/pair-request-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ campaignId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    return privateResponse({
      candidates: await pairRequestService().search(
        participantToken(request),
        (await context.params).campaignId,
        request.nextUrl.searchParams.get("q"),
      ),
    });
  } catch (error) {
    return participantFailure(error);
  }
}
