import type { CampaignStatus } from "./types";

export interface ProgramPerson {
  assignmentId: string;
  registrationId: string;
  fullName: string;
  congregation: string;
}
export interface ProgramPoint {
  id: string;
  name: string;
  locationText: string;
  description: string;
}
export interface ProgramSnapshot {
  campaign: {
    id: string;
    name: string;
    locationName: string;
    locationDetails: string;
  };
  days: {
    id: string;
    date: string;
    label: string;
    points: ProgramPoint[];
    blocks: {
      id: string;
      startTime: string;
      endTime: string;
      label: string;
      cells: {
        pointId: string;
        active: boolean;
        slots: [ProgramPerson | null, ProgramPerson | null];
      }[];
    }[];
  }[];
}
export interface ProgramIssue {
  code: string;
  message: string;
  date: string;
  hours: string;
  point: string;
  person: string;
  entityId: string;
}
export interface ProgramView {
  mode: "draft" | "published";
  campaignStatus: CampaignStatus;
  version: number | null;
  publishedAt: string | null;
  plannerRevision: string | null;
  snapshot: ProgramSnapshot;
  blockingErrors: ProgramIssue[];
  warnings: ProgramIssue[];
  assignmentCount: number;
}
export interface ProgramVersion {
  id: string;
  campaignId: string;
  version: number;
  status: "published";
  sourcePlannerRevision: string;
  publishedAt: FirebaseFirestore.Timestamp;
  publishedBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  snapshot: ProgramSnapshot;
  warnings: ProgramIssue[];
  assignmentCount: number;
}
export interface PersonalProgram {
  campaigns: {
    name: string;
    published: boolean;
    version: number | null;
    publishedAt: string | null;
    turns: {
      turnId?: string;
      canRequestChange?: boolean;
      changeRequestStatus?: "pending" | "approved";
      date: string;
      dayLabel: string;
      startTime: string;
      endTime: string;
      blockLabel: string;
      pointName: string;
      locationText: string;
      description: string;
      companionName: string | null;
    }[];
  }[];
}
export const publicationConflictMessage =
  "La planificación cambió o el programa ya fue publicado. Actualiza antes de continuar.";
