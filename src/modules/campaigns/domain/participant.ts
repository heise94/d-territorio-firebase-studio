import type { Timestamp } from "firebase-admin/firestore";

/** Server-side identity. Never serialize this entity to a browser. */
export interface Participant {
  id: string;
  fullName: string;
  phoneNormalized: string;
  congregationId?: string;
  pinHash: string;
  active: boolean;
  sessionVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ParticipantDTO {
  id: string;
  fullName: string;
  congregationId?: string;
  active: boolean;
}

export interface DeviceSession {
  id: string;
  participantId: string;
  tokenHash: string;
  sessionVersion: number;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt: Timestamp | null;
}

export function participantDTO(participant: Participant): ParticipantDTO {
  return {
    id: participant.id,
    fullName: participant.fullName,
    ...(participant.congregationId
      ? { congregationId: participant.congregationId }
      : {}),
    active: participant.active,
  };
}
