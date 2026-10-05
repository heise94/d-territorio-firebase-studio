import type { Timestamp } from "firebase-admin/firestore";
import type { CampaignStatus } from "./types";
import type { MaxTurns } from "./registration";

export interface Assignment {
  id: string;
  campaignId: string;
  timeBlockId: string;
  pointId: string;
  registrationId: string;
  slotNumber: 1 | 2;
  status: "draft" | "cancelled";
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  maxTurnsOverride: boolean;
  availabilityOverride: boolean;
}
export interface PlannerPerson {
  registrationId: string;
  fullName: string;
  congregation: string;
  assignedTurns: number;
  maxTurns: MaxTurns;
  available: boolean;
  profileActive: boolean;
  accepted: null | {
    requestId: string;
    otherRegistrationId: string;
    otherName: string;
    availabilityConflict: boolean;
    blockAvailabilityConflict: boolean;
    participationConflict: boolean;
  };
}
export interface PlannerAssignment {
  id: string;
  registrationId: string;
  pointId: string;
  slotNumber: 1 | 2;
  version: number;
  person: PlannerPerson;
  warnings: string[];
  availabilityOverride: boolean;
  maxTurnsOverride: boolean;
}
export interface PlannerBlock {
  id: string;
  dayId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}
export interface PlannerView {
  campaign: { id: string; name: string; status: CampaignStatus };
  blocks: PlannerBlock[];
  block: (PlannerBlock & { capacity: number | null; active: boolean }) | null;
  mutable: boolean;
  points: {
    id: string;
    name: string;
    globalActive: boolean;
    active: boolean;
    slots: [PlannerAssignment | null, PlannerAssignment | null];
  }[];
  available: PlannerPerson[];
  exceptions: PlannerPerson[];
  metrics: {
    available: number;
    assigned: number;
    unassigned: number;
    reserve: number;
    reservePotential: number | null;
    activePoints: number;
    openSlots: number;
    incompletePoints: number;
  };
  conflicts: string[];
  updatedAt: string;
}
export interface PlannerWarningDTO {
  registrationId: string;
  fullName: string;
  kind: "availability" | "maxTurns";
  message: string;
}
export const plannerConflictMessage =
  "La planificación cambió mientras trabajabas. Actualiza el bloque e intenta nuevamente.";
