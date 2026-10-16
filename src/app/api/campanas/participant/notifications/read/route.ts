import { NextRequest } from "next/server";
import {
  participantToken,
  privateResponse,
  participantFailure,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { markNotificationsRead } from "@/modules/campaigns/server/notification-center";
export async function POST(request: NextRequest) {
  try {
    return privateResponse(
      await markNotificationsRead(
        participantToken(request),
        await registrationBody(request),
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
