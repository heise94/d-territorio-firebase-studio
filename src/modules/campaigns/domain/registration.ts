import type { Timestamp } from "firebase-admin/firestore";
import type { CampaignStatus } from "./types";

export type MaxTurns = 1 | 2 | 3 | null;
export type RegistrationStatus = "active" | "withdrawn" | "cancelled";
/** Internal operational review. It is intentionally absent from participant DTOs. */
export type RegistrationApprovalStatus =
  | "pending"
  | "approved"
  | "not_approved";
export interface CampaignRegistration {
  id: string;
  campaignId: string;
  participantId: string;
  maxTurns: MaxTurns;
  registrationStatus: RegistrationStatus;
  /** Undefined is a pre-review legacy record and is treated as approved. */
  approvalStatus?: RegistrationApprovalStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function registrationIsApproved(row: CampaignRegistration): boolean {
  return row.approvalStatus === undefined || row.approvalStatus === "approved";
}
export interface Availability {
  id: string;
  campaignId: string; // Server-maintained query key; never a participant identity.
  registrationId: string;
  timeBlockId: string;
  available: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface Coverage {
  availableCount: number;
  capacity: number | null;
  remainingCapacity: number | null;
  reservePotential: number | null;
  isFull: boolean;
  needsSupport: boolean;
}
export interface RegistrationDTO {
  id: string;
  maxTurns: MaxTurns;
  registrationStatus: RegistrationStatus;
}
export interface CampaignSummary {
  id: string;
  name: string;
  description: string;
  locationName: string;
  locationDetails: string;
  status: CampaignStatus;
  companionRequestsEnabled: boolean;
  registration: RegistrationDTO | null;
}
export interface RegistrationView {
  campaign: CampaignSummary;
  congregationId: string | null;
  congregations: { id: string; name: string }[];
  days: {
    id: string;
    date: string;
    label: string;
    blocks: {
      id: string;
      startTime: string;
      endTime: string;
      label: string;
      selected: boolean;
      coverage: Coverage;
    }[];
  }[];
  unavailableSelectionCount: number;
}

export function calculateCoverage(
  availableCount: number,
  override?: number,
  defaultCapacity?: number,
): Coverage {
  const capacity = override ?? defaultCapacity ?? null;
  return {
    availableCount,
    capacity,
    remainingCapacity:
      capacity === null ? null : Math.max(capacity - availableCount, 0),
    reservePotential:
      capacity === null ? null : Math.max(availableCount - capacity, 0),
    isFull: capacity !== null && availableCount >= capacity,
    needsSupport: capacity !== null && availableCount < capacity / 2,
  };
}
