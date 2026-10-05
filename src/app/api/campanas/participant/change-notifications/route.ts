import { NextRequest } from "next/server";
import { participantNotifications } from "@/modules/campaigns/server/change-notifications";
import {
  participantToken,
  privateResponse,
  participantFailure,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return privateResponse(
      await participantNotifications(participantToken(request)),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
