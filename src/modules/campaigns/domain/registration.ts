import type { Timestamp } from "firebase-admin/firestore";
import type { CampaignStatus } from "./types";

export type MaxTurns = 1 | 2 | 3 | null;
export type RegistrationStatus = "active" | "withdrawn" | "cancelled";
/** Historical review state. New participation never depends on this field. */
export type RegistrationApprovalStatus =
  | "pending"
  | "approved"
  | "not_approved";
export interface CampaignRegistration {
  id: string;
  campaignId: string;
  participantId: string;
  /** Congregation selected for this campaign; legacy registrations use the profile fallback. */
  congregationId?: string;
  /** Legacy preference; absence now means there is no limit. */
  maxTurns?: MaxTurns;
  registrationStatus: RegistrationStatus;
  /** Legacy value retained for historical records; absent from participant DTOs. */
  approvalStatus?: RegistrationApprovalStatus;
  /** Campaign-scoped safeguarding metadata; never copied to the global profile. */
  isMinor?: boolean;
  guardianRegistrationId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function registrationIsEligible(row: CampaignRegistration): boolean {
  // Historical review results no longer gate participation. Callers check
  // profile state and availability for operations that need those conditions.
  return row.registrationStatus === "active";
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
export type ParticipantCoverageState = "covered" | "last_slots" | "normal" | "needs_support";
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
  organization?: { role: "CAMPAIGN_ADMIN" | "CAMPAIGN_HELPER"; label: string } | null;
}
export interface RegistrationView {
  campaign: CampaignSummary;
  /** True when availability can be guided by the currently published program. */
  publishedProgram: boolean;
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
      coverageState: ParticipantCoverageState;
      selectionClosed?: boolean;
      /** Qualitative only: the published program still needs staffing in this block. */
      programNeedsSupport?: boolean;
    }[];
  }[];
  unavailableSelectionCount: number;
}

/** Qualitative signal for participants; coverage counts stay server-side. */
export function participantCoverageState(
  availableCount: number,
  minimumParticipants?: number,
): ParticipantCoverageState {
  if (!minimumParticipants || minimumParticipants <= 0) return "normal";
  const missing = minimumParticipants - availableCount;
  if (missing <= 0) return "covered";
  if (missing <= 3) return "last_slots";
  if (missing <= 8) return "normal";
  return "needs_support";
}

/** Two extra volunteers are accepted as possible replacements. No configured target means no cap. */
export function participantSelectionClosed(available: number, required: number): boolean {
  return required > 0 && available >= required + 2;
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
