import { NextRequest } from "next/server";
import { getPersonalProgram } from "@/modules/campaigns/server/program-service";
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
      await getPersonalProgram(
        participantToken(request),
        request.nextUrl.searchParams.size > 0,
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
