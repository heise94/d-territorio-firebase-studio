import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { campaignsAdminDb } from "./firebase-admin";
import { CampaignAdminDashboardService } from "./admin-dashboard-service";
import { AuthError } from "./auth/service";
import { operationalLog } from "./operational-log";

export const dashboardService = () =>
  new CampaignAdminDashboardService(campaignsAdminDb());
export function organizerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return match?.[1] ?? "";
}
export function dashboardSearch(request: NextRequest) {
  const value = request.headers.get("X-Campaign-Search") ?? "";
  // Invalid transport is passed as an invalid filter: authorization still happens first.
  if (value.length > 1440) return "x".repeat(121);
  try {
    return decodeURIComponent(value);
  } catch {
    return "x".repeat(121);
  }
}
export function dashboardResponse(data: unknown, status = 200) {
  operationalLog("admin", status);
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Authorization, X-Campaign-Search",
    },
  });
}
export function dashboardFailure(error: unknown) {
  // Never log queries, participant identities or credentials.
  return dashboardResponse(
    {
      error:
        error instanceof AuthError
          ? error.message
          : "No se pudo consultar el panel. Intenta nuevamente.",
    },
    error instanceof AuthError ? error.status : 503,
  );
}
