import type { CampaignStatus } from "./types";
import type { Coverage, MaxTurns, RegistrationStatus } from "./registration";
import type { PairRequestStatus } from "./pair-request";

export type CoverageState =
  "needs_support" | "medium" | "near_full" | "full" | "undefined";
export const coverageLabels: Record<CoverageState, string> = {
  needs_support: "Necesita apoyo",
  medium: "Cobertura media",
  near_full: "Cerca de completo",
  full: "Completo",
  undefined: "Capacidad por definir",
};
export function coverageState(coverage: Coverage): CoverageState {
  if (coverage.capacity === null) return "undefined";
  if (coverage.isFull) return "full";
  if (coverage.needsSupport) return "needs_support";
  return coverage.availableCount / coverage.capacity >= 0.8
    ? "near_full"
    : "medium";
}
export interface AdminBlock {
  id: string;
  dayId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  coverage: Coverage;
  state: CoverageState;
}
export interface AdminDay {
  id: string;
  date: string;
  label: string;
  blocks: AdminBlock[];
}
export interface AdminOverview {
  campaign: {
    id: string;
    name: string;
    locationName: string;
    locationDetails: string;
    dates: string[];
    status: CampaignStatus;
  };
  metrics: {
    activeRegistrations: number;
    needsSupportBlocks: number;
    fullBlocks: number;
    reservePotential: number;
    pendingRequests: number;
    acceptedLinks: number;
    acceptedAvailabilityConflicts: number;
  };
  days: AdminDay[];
  congregations: { id: string; name: string }[];
  updatedAt: string;
}
export interface AdminAcceptedLink {
  requestId: string;
  otherRegistrationId: string;
  otherName: string;
  availabilityConflict: boolean;
  participationConflict: boolean;
}
export interface AdminParticipantRow {
  registrationId: string;
  fullName: string;
  congregationId: string | null;
  congregation: string;
  availableBlockCount: number;
  maxTurns: MaxTurns;
  registrationStatus: RegistrationStatus;
  profileActive: boolean;
  accepted: AdminAcceptedLink | null;
  pendingSent: number;
  pendingReceived: number;
}
export interface AdminParticipantList {
  rows: AdminParticipantRow[];
  total: number;
  page: number;
  pageSize: number;
  updatedAt: string;
}
export interface AdminAvailability {
  blockId: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  label: string;
  active: boolean;
}
export interface AdminPairDetail {
  id: string;
  status: PairRequestStatus;
  direction: "sent" | "received";
  otherRegistrationId: string;
  otherName: string;
  availabilityConflict: boolean;
  participationConflict: boolean;
  sharedBlocks: AdminAvailability[];
}
export interface AdminParticipantDetail extends AdminParticipantRow {
  phone: string | null;
  availability: AdminAvailability[];
  pairRequests: AdminPairDetail[];
  updatedAt: string;
}
export function orderedCoverageDays(
  days: AdminDay[],
  chronological: boolean,
): AdminDay[] {
  const chronologicalBlock = (a: AdminBlock, b: AdminBlock) =>
    a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id);
  const deficit = (block: AdminBlock) => block.coverage.remainingCapacity ?? -1;
  const result = days.map((day) => ({
    ...day,
    blocks: [...day.blocks].sort((a, b) =>
      chronological
        ? chronologicalBlock(a, b)
        : deficit(b) - deficit(a) || chronologicalBlock(a, b),
    ),
  }));
  return result.sort((a, b) =>
    chronological
      ? a.date.localeCompare(b.date)
      : Math.max(-1, ...b.blocks.map(deficit)) -
          Math.max(-1, ...a.blocks.map(deficit)) ||
        a.date.localeCompare(b.date),
  );
}
