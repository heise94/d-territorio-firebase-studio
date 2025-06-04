import type { Timestamp } from 'firebase/firestore';
import type { UserRole, PermissionId } from '@/lib/constants';

export interface UserProfile {
  id: string; // doc ID from Firestore
  name: string;
  email: string; // unique
  phoneNumber?: string;
  role: UserRole;
  status: 'Activo' | 'Bloqueado';
  assignedGroupId?: string; // FK to preachingGroups
  invitationToken?: string | null; // Can be null after acceptance
  invitationStatus?: 'pending' | 'accepted';
  firebaseAuthUid?: string; // UID from Firebase Auth
  isBlockedForGeneralAI?: boolean;
  addedByGroupId?: string; // FK to preachingGroups
  createdAt?: Timestamp; // Optional for existing data, should be set for new
  updatedAt?: Timestamp; // Optional for existing data, should be set for new
}

export interface RoleConfiguration {
  [roleName: string]: PermissionId[];
}

export interface SettingsDoc {
  rolePermissions?: RoleConfiguration;
  // Other settings like preachingSchedules, groupPreachingDays, etc. will be added later
}

export interface Casa {
  id: string; // Firestore document ID
  ownerName: string;
  address: string;
  city?: string;
  status: 'available' | 'do_not_call' | 'contacted' | 'needs_revisit'; // Estado de la casa
  availabilityNotes?: string; // Notas sobre cuándo es mejor contactar, horarios, etc.
  notes?: string; // Notas generales sobre la casa o los residentes
  assignedTerritoryId?: string; // FK al territorio al que pertenece (opcional)
  lastVisitedAt?: Timestamp; // Fecha de la última visita
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // User ID of creator
  updatedBy?: string; // User ID of last updater
}

// Placeholder for other types to be defined in later phases
export interface Territory {
  id: string;
  name: string;
  // ... other fields
}

export interface PreachingGroup {
  id: string;
  name: string;
  // ... other fields
}
