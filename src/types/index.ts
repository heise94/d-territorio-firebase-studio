
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

export interface DayAvailability {
  am?: boolean;
  pm?: boolean;
}

export interface CasaAvailability {
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability; // As per common preaching schedules, including Sat/Sun might be useful
  sunday?: DayAvailability;   // Or keep it Lu-Vi if strictly for weekday prep meetings
}

export interface Casa {
  id: string; // Firestore document ID
  ownerName: string;
  address: string;
  phoneNumber?: string;
  availableDays?: CasaAvailability; // Consistent with earlier structure, e.g., { monday: { am: true, pm: false }, ... }
  isBlocked: boolean; // Replaces 'status' field for simplicity. True if "No Visitar" or otherwise blocked.
  notes?: string;
  associatedTerritories?: string[]; // Array of territory names or IDs
  isSuitableForRural?: boolean;
  isBlockedForGeneralAI?: boolean;
  addedByGroupId?: string; // Optional FK to preachingGroups

  lastVisitedAt?: Timestamp; // Fecha de la última visita - Retaining from previous
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // User ID of creator - Retaining from previous
  updatedBy?: string; // User ID of last updater - Retaining from previous
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
