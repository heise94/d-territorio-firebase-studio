import { NextRequest } from "next/server";
import {
  participantToken,
  privateResponse,
  participantFailure,
} from "@/modules/campaigns/server/participant-http";
import { participantAuth } from "@/modules/campaigns/server/auth/session";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { campaignCollections } from "@/modules/campaigns/lib/paths";
import { AuthError } from "@/modules/campaigns/server/auth/service";
import { safeNotificationRoute } from "@/modules/campaigns/domain/notification";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (
      !id ||
      !/^[a-f0-9]{64}$/.test(id) ||
      [...request.nextUrl.searchParams.keys()].some((k) => k !== "id")
    )
      throw new AuthError(400, "Aviso inválido.");
    return privateResponse(
      await participantAuth().withParticipantTransaction(
        participantToken(request),
        async (tx, person) => {
          const row = await tx.get(
            campaignsAdminDb()
              .collection(campaignCollections.notifications)
              .doc(id),
          );
          if (row.data()?.participantId !== person.id)
            throw new AuthError(404, "Aviso no disponible.");
          return {
            type: row.data()!.type,
            targetRoute: safeNotificationRoute(row.data()!.targetRoute),
          };
        },
      ),
    );
  } catch (error) {
    return participantFailure(error);
  }
}
