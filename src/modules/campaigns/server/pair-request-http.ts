import "server-only";
import { participantAuth } from "./auth/session";
import { campaignsAdminDb } from "./firebase-admin";
import { PairRequestService } from "./pair-request-service";

export const pairRequestService = () =>
  new PairRequestService(campaignsAdminDb(), participantAuth());
