import { NextRequest } from "next/server";
import {
  participantToken,
  privateResponse,
  participantFailure,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { notificationsPage } from "@/modules/campaigns/server/notification-center";
export async function GET(request: NextRequest) {
  try {
    const input = Object.fromEntries(request.nextUrl.searchParams);
    return privateResponse(
      await notificationsPage(participantToken(request), input),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
