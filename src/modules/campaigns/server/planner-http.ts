import "server-only";
import type { NextRequest } from "next/server";
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import {
  dashboardResponse,
  dashboardFailure,
  organizerToken,
} from "./admin-dashboard-http";
import { registrationBody } from "./participant-http";
import { PlannerWarnings } from "./planner-service";
import { plannerConflictMessage } from "../domain/planner";
export async function plannerBody(request: NextRequest) {
  await authorizeCampaignDashboard(organizerToken(request));
  return registrationBody(request);
}
export function plannerFailure(error: unknown) {
  if (error instanceof PlannerWarnings)
    return dashboardResponse(
      { error: error.message, warnings: error.warnings },
      422,
    );
  if (
    [10, "aborted", "ABORTED"].includes(
      (error as { code?: number | string })?.code ?? "",
    )
  )
    return dashboardResponse({ error: plannerConflictMessage }, 409);
  return dashboardFailure(error);
}
