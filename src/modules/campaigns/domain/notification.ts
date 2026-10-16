import type { Timestamp } from "firebase-admin/firestore";

export type NotificationType =
  | "pair_request_created"
  | "pair_request_accepted"
  | "pair_request_rejected"
  | "program_published"
  | "assignment_changed"
  | "change_request_resolved"
  | "change_request_approved"
  | "change_request_rejected"
  | "turn_reminder";

export interface InternalNotification {
  id: string;
  participantId: string;
  campaignId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetRoute: string;
  metadata: { version?: number; requestId?: string; assignmentId?: string };
  createdAt: Timestamp;
  readAt: Timestamp | null;
}

export interface CampaignPushSubscription {
  id: string;
  participantId: string;
  sessionRef: string;
  fcmToken: string;
  tokenHash: string;
  platform: "android" | "ios" | "desktop" | "unknown";
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt: Timestamp;
  disabledAt?: Timestamp;
}

export const notificationRoutes = [
  "/campanas",
  "/campanas/mi-programa",
  "/campanas/avisos",
  "/campanas/participar-juntos",
] as const;
export function safeNotificationRoute(value: unknown): string {
  return typeof value === "string" &&
    (notificationRoutes as readonly string[]).includes(value)
    ? value
    : "/campanas/avisos";
}
