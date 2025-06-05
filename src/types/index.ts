
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
  availability?: UserAvailability; 
  addedByGroupId?: string; // Optional FK to preachingGroups, if user was added via a group context
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RoleConfiguration {
  [roleName: string]: PermissionId[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type PreachingType = 'general' | 'rural' | 'zoom';
export type ScheduleSlotStatus = 'fixed' | 'tentative';

export interface ProgramScheduleSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  // endTime?: string; // HH:mm, optional - REMOVED
  type: PreachingType;
  status: ScheduleSlotStatus;
}

export interface SettingsDoc {
  rolePermissions?: RoleConfiguration;
  programScheduleSlots?: ProgramScheduleSlot[];
  // Other settings like groupPreachingDays, ruralRotation, etc. will be added later
}


export interface DayAvailability {
  am?: boolean;
  pm?: boolean;
}

export interface CasaAvailability { // Also used for UserAvailability at a high level if not using specific slots
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
}

// More granular availability for users, pointing to specific schedule slots
export interface UserAvailability {
  availableSlotIds?: string[]; // Array of ProgramScheduleSlot IDs
  // We might retain CasaAvailability for general preferences if needed, 
  // or completely replace it with slot-based availability.
  // For now, let's assume UserAvailability will primarily use availableSlotIds.
  // Legacy CasaAvailability structure can be kept for migration or other purposes.
  general?: CasaAvailability; 
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
