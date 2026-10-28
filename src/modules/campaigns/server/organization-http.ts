import "server-only";
import { campaignsAdminDb } from "./firebase-admin";
import { participantAuth } from "./auth/session";
import { CampaignOrganizationService } from "./organization-service";
import { participantFailure, participantToken, privateResponse, registrationBody } from "./participant-http";
import { PlannerWarnings } from "./planner-service";
import { ProgramValidationError } from "./program-service";

export const organizationService = () =>
  new CampaignOrganizationService(campaignsAdminDb(), participantAuth());
export function organizationFailure(error: unknown) {
  if (error instanceof PlannerWarnings) return privateResponse({ error: error.message, warnings: error.warnings }, 422);
  if (error instanceof ProgramValidationError) return privateResponse({ error: error.message, blockingErrors: error.view.blockingErrors, warnings: error.view.warnings, plannerRevision: error.view.plannerRevision }, 422);
  return participantFailure(error);
}
export { participantToken as organizationToken, privateResponse as organizationResponse, registrationBody as organizationBody };
