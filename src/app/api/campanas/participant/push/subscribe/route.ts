import { NextRequest } from "next/server";
import {
  participantToken,
  privateResponse,
  participantFailure,
  registrationBody,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { subscribePush } from "@/modules/campaigns/server/push-subscriptions";
export async function POST(request: NextRequest) {
  try {
    return privateResponse(
      await subscribePush(
        participantToken(request),
        await registrationBody(request),
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
