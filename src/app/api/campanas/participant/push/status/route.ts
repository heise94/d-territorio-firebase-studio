import { NextRequest } from "next/server";
import {
  participantToken,
  privateResponse,
  participantFailure,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { pushStatus } from "@/modules/campaigns/server/push-subscriptions";
export async function GET(request: NextRequest) {
  try {
    return privateResponse(await pushStatus(participantToken(request)));
  } catch (error) {
    return participantFailure(error);
  }
}
