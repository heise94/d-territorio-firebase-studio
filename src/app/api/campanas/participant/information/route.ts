import { NextRequest } from "next/server";
import { participantInformation } from "@/modules/campaigns/server/information-service";
import { participantFailure, participantToken, privateResponse } from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { return privateResponse(await participantInformation(participantToken(request))); }
  catch (error) { return participantFailure(error); }
}
