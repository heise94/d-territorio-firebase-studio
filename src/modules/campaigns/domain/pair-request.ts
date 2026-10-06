import type { Timestamp } from "firebase-admin/firestore";
import type { CampaignStatus } from "./types";

export type PairRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";
export interface PairRequest {
  id: string;
  campaignId: string;
  requesterRegistrationId: string;
  recipientRegistrationId: string;
  status: PairRequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  respondedAt?: Timestamp;
}
export interface PairCandidate {
  registrationId: string;
  fullName: string;
  congregation: string;
}
export interface SharedBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}
export interface PairRequestDTO {
  id: string;
  status: PairRequestStatus;
  direction: "received" | "sent";
  other: Omit<PairCandidate, "registrationId">;
  createdAt: string;
  respondedAt: string | null;
  sharedBlocks: SharedBlock[];
  availabilityConflict: boolean;
  participationConflict: boolean;
}
export interface PairRequestView {
  campaign: { id: string; name: string; status: CampaignStatus };
  editable: boolean;
  requests: PairRequestDTO[];
}
export interface PairInboxGroup {
  campaignId: string;
  campaignName: string;
  count: number;
  senderNames: string[];
}

export function normalizePairSearch(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}
