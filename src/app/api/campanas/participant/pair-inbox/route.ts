import { NextRequest } from "next/server";
import {
  participantFailure,
  participantToken,
  privateResponse,
} from "@/modules/campaigns/server/participant-http";
import { pairRequestService } from "@/modules/campaigns/server/pair-request-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return privateResponse({
      groups: await pairRequestService().inbox(participantToken(request)),
    });
  } catch (error) {
    return participantFailure(error);
  }
}
