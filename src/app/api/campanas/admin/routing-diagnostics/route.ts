import { NextRequest } from "next/server";
import { requireCampaignOrganizer } from "@/modules/campaigns/server/firebase-admin";
import { organizerToken, dashboardResponse, dashboardFailure } from "@/modules/campaigns/server/admin-dashboard-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary F11D diagnostic: never return cookies, tokens or arbitrary headers.
export async function GET(request: NextRequest) {
  try {
    await requireCampaignOrganizer(organizerToken(request));
    const canonical = new URL(process.env.CAMPAIGNS_APP_ORIGIN!).hostname;
    return dashboardResponse({
      hostMatchesCanonical: request.headers.get("host") === canonical,
      forwardedMatchesCanonical: request.headers.get("x-forwarded-host") === canonical,
      originalMatchesCanonical: request.headers.get("x-original-host") === canonical,
      urlMatchesCanonical: request.nextUrl.hostname === canonical,
      routingEnabled: process.env.CAMPAIGNS_HOST_ROUTING === "true",
      knownHeaderPresence: ["host", "x-forwarded-host", "x-original-host", "forwarded"].filter(name => request.headers.has(name)),
    });
  } catch (error) {
    return dashboardFailure(error);
  }
}
