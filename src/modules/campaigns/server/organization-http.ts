import "server-only";
import { campaignsAdminDb } from "./firebase-admin";
import { participantAuth } from "./auth/session";
import { CampaignOrganizationService } from "./organization-service";
import { participantFailure, participantToken, privateResponse, registrationBody } from "./participant-http";

export const organizationService = () =>
  new CampaignOrganizationService(campaignsAdminDb(), participantAuth());
export { participantFailure as organizationFailure, participantToken as organizationToken, privateResponse as organizationResponse, registrationBody as organizationBody };
