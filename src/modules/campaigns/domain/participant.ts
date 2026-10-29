import type { Timestamp } from "firebase-admin/firestore";
import { participantName } from "../lib/presentation";

/** Server-side identity. Never serialize this entity to a browser. */
export interface Participant {
  id: string;
  fullName: string;
  preserveNameCase?: boolean;
  /** Absent for accountless people entered by an organizer. */
  phoneNormalized?: string;
  congregationId?: string;
  /** Absent when an organizer records a person without creating login access. */
  pinHash?: string;
  mustChangePin?: boolean;
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
  mustChangePin?: boolean;
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
    fullName: participantName(participant),
    ...(participant.congregationId
      ? { congregationId: participant.congregationId }
      : {}),
    active: participant.active,
    ...(participant.mustChangePin ? { mustChangePin: true } : {}),
  };
}
