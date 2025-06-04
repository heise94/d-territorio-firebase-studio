
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
  associatedTerritories?: string[]; 
  isSuitableForRural?: boolean;
  // isBlockedForGeneralAI?: boolean; // Removed as requested
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
  groupIds?: string[]; // IDs of preachingGroups assigned
  // colorClass?: string; // Removed as requested
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface PreachingGroup {
  id: string;
  name: string;
  // ... other fields
}
