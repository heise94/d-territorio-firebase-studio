import { NextRequest } from "next/server";
import {
  createChangeRequest,
  participantChanges,
} from "@/modules/campaigns/server/change-request-participant";
import {
  participantToken,
  registrationBody,
  privateResponse,
  participantFailure,
} from "@/modules/campaigns/server/participant-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return privateResponse(await participantChanges(participantToken(request)));
  } catch (error) {
    return participantFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    return privateResponse(
      await createChangeRequest(
        participantToken(request),
        await registrationBody(request),
      ),
      201,
    );
  } catch (error) {
    return participantFailure(error);
  }
}
