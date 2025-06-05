
import type { Timestamp } from 'firebase/firestore';
import type { UserRole, PermissionId } from '@/lib/constants';

export interface UserProfile {
  id: string; // doc ID from Firestore
  name: string;
  email: string; // unique
  phoneNumber?: string;
  role: UserRole;
  status: 'Activo' | 'Bloqueado'; // Enum for status
  assignedGroupId?: string; // FK to preachingGroups
  invitationToken?: string | null; // Can be null after acceptance
  invitationStatus?: 'pending' | 'accepted'; // Enum for invitation status
  firebaseAuthUid?: string; // UID from Firebase Auth
  isBlockedForGeneralAI?: boolean; // Optional, for AI considerations
  availability?: CasaAvailability; // User's availability
  addedByGroupId?: string; // Optional FK to preachingGroups, if user was added via a group context
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

export interface CasaAvailability { // Also used for UserAvailability
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
}

export interface Casa {
  id: string; // Firestore document ID
  ownerName: string;
  address: string;
  phoneNumber?: string;
  availableDays?: CasaAvailability;
  isBlocked: boolean;
  notes?: string;
  isSuitableForRural?: boolean;
  addedByGroupId?: string; // Optional FK to preachingGroups

  lastVisitedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export type TerritoryType = "urban" | "rural";

export interface Territory {
  id: string; // Firestore document ID
  number?: string; // For urban territories
  name: string;
  type: TerritoryType;
  mapImageUrl?: string; // Data URI or URL to image
  googleMapsLink?: string;
  lastWorked?: string; // "dd/MM/yyyy" format, updated from reports
  totalBlocks?: number;
  blockHouseCounts?: number[]; // Array with house count per block
  approxHouseCount?: number; // Calculated from blockHouseCounts
  doNotCallAddresses?: string[];
  warnings?: string[];
  isBlocked: boolean; // Default false
  blockReason?: string;
  unblockDate?: Timestamp;
  groupIds?: string[]; // IDs of preachingGroups assigned (this is the territory being assigned to groups)
  associatedCasaIds?: string[]; // IDs/Names of nearby houses
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface PreachingGroup {
  id: string; // Firestore document ID
  name: string;
  description?: string;
  superintendentId?: string; // User ID of the superintendent (SG)
  auxiliaryId?: string; // User ID of the auxiliary
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // User ID or name
  updatedBy?: string; // User ID or name
}

