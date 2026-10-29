import { NextRequest } from "next/server";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { requireCampaignAccess } from "@/modules/campaigns/server/campaign-access";
import { participantAuth, revokeParticipantAdminSessions } from "@/modules/campaigns/server/auth/session";
import { registrationBody } from "@/modules/campaigns/server/participant-http";
import { dashboardFailure, dashboardResponse, organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";
import { campaignCollections as names } from "@/modules/campaigns/lib/paths";
import { AuthError } from "@/modules/campaigns/server/auth/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string; registrationId: string }> }) {
  try {
    const { campaignId, registrationId } = await context.params;
    const input = await registrationBody(request) as { newPin?: unknown };
    if (!input || typeof input.newPin !== "string" || Object.keys(input).some((key) => key !== "newPin")) return dashboardResponse({ error: "Datos inválidos." }, 400);
    const db = campaignsAdminDb();
    const access = await requireCampaignAccess(db, organizerToken(request), campaignId, ["SUPER_ADMIN", "CAMPAIGN_ADMIN"]);
    await participantAuth().resetCampaignPin(campaignId, registrationId, input.newPin, access.uid, async (tx) => {
      const grants = await tx.get(db.collection(names.organizerUsers).where("uid", "==", access.uid));
      const superAdmin = grants.docs.some((doc) => doc.data().active === true && doc.data().role === "SUPER_ADMIN");
      if (superAdmin) return { superAdmin: true };
      if (grants.docs.some((doc) => doc.data().active === true && doc.data().role === "CAMPAIGN_ADMIN" && doc.data().campaignId === campaignId)) return { superAdmin: false };
      const [registrations, team] = await Promise.all([tx.get(db.collection(names.campaignRegistrations).where("participantId", "==", access.uid)), tx.get(db.collection(names.campaignTeams).doc(campaignId))]);
      const helpers = team.data()?.helperRegistrationIds;
      if (!Array.isArray(helpers) || !registrations.docs.some((doc) => doc.data().campaignId === campaignId && doc.data().registrationStatus === "active" && helpers.includes(doc.id))) throw new AuthError(403, "Ya no tienes acceso a esta campaña.");
      return { superAdmin: false };
    }, revokeParticipantAdminSessions);
    return dashboardResponse({ ok: true });
  } catch (error) { return dashboardFailure(error); }
}
