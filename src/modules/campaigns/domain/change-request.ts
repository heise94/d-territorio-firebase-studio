import type { Timestamp } from "firebase-admin/firestore";
export type ChangeStatus = "pending" | "approved" | "rejected" | "resolved";
export type ChangeReason = "cannot_attend" | "schedule_conflict" | "other";
export interface ChangeRequest {
  id: string;
  campaignId: string;
  registrationId: string;
  participantId: string;
  assignmentId: string;
  sourceProgramVersionId: string;
  sourceProgramVersion: number;
  status: ChangeStatus;
  reasonCode: ChangeReason;
  comment: string;
  organizerResponse: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolvedProgramVersionId?: string;
}
export interface InternalNotification {
  id: string;
  participantId: string;
  campaignId: string;
  type:
    | "change_request_approved"
    | "change_request_rejected"
    | "change_request_resolved"
    | "assignment_changed";
  title: string;
  body: string;
  targetRoute: string;
  metadata: { version?: number; requestId?: string };
  createdAt: Timestamp;
  readAt: Timestamp | null;
}
export const changeConflictMessage =
  "El programa cambió mientras trabajabas. Actualiza antes de continuar.";
export const changeStatusLabels: Record<ChangeStatus, string> = {
  pending: "Solicitud pendiente",
  approved: "Solicitud aprobada",
  rejected: "Solicitud rechazada",
  resolved: "Cambio realizado",
};
export const changeReasonLabels: Record<ChangeReason, string> = {
  cannot_attend: "No puedo asistir",
  schedule_conflict: "Tengo un problema con el horario",
  other: "Otro motivo",
};
