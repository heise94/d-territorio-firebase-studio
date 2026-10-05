import { NextRequest } from "next/server";
import {
  participantFailure,
  participantToken,
  privateResponse,
  registrationService,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return privateResponse({
      campaigns: await registrationService().list(participantToken(request)),
    });
  } catch (error) {
    return participantFailure(error);
  }
}
