
import type { Timestamp } from 'firebase/firestore';
import type { UserRole, PermissionId } from '@/lib/constants';

export interface UserProfile {
  id: string; // doc ID from Firestore
  name: string;
  email: string; // unique
  phoneNumber?: string;
  role: UserRole;
  status: 'Activo' | 'Bloqueado' | 'Pendiente Aprobación Admin'; // Enum for status, added new status
  blockReason?: string; // New field for block reason
  assignedGroupId?: string; // FK to preachingGroups
  invitationToken?: string | null; // Can be null after acceptance
  invitationStatus?: 'pending' | 'accepted'; // Enum for invitation status
  firebaseAuthUid?: string; // UID from Firebase Auth
  isBlockedForGeneralAI?: boolean; // Optional, for AI considerations
  availability?: UserAvailability;
  addedByGroupId?: string; // FK to preachingGroups, to know which group added this user
  adminApprovalStatus?: 'pending' | 'approved'; // Status for admin approval
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RoleConfiguration {
  [roleName: string]: PermissionId[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type PreachingType = 'general' | 'rural' | 'zoom'; // Consistent with disponibilidad page
export type ScheduleSlotStatus = 'fixed' | 'tentative';

export interface ProgramScheduleSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  type: PreachingType;
  status: ScheduleSlotStatus;
}

export type CampaignType = 'invitation' | 'superintendent_visit' | 'special';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  startDate: Date | Timestamp; // Can be Date in JS, Timestamp in Firestore
  endDate: Date | Timestamp;   // Can be Date in JS, Timestamp in Firestore
  superintendentName?: string | null; // Only for 'superintendent_visit'
  specialCampaignTerritoriesPerDay?: number | null;
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CustomHoliday {
  id: string;
  name: string;
  date: Date | Timestamp; // Can be Date in JS, Timestamp in Firestore
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Assembly {
  id: string;
  name: string; // e.g., "Asamblea de Circuito 'Amemos a Jehová'", "Asamblea Regional 2024"
  startDate: Date | Timestamp; // Can be Date in JS, Timestamp in Firestore
  endDate: Date | Timestamp;   // Can be Date in JS, Timestamp in Firestore
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SettingsDoc {
  rolePermissions?: RoleConfiguration;
  programScheduleSlots?: ProgramScheduleSlot[];
  groupOrganizedDays?: DayOfWeek[];
  campaignsList?: Campaign[];      // Renamed for clarity in Firestore
  holidaysList?: CustomHoliday[];  // Renamed for clarity in Firestore
  assembliesList?: Assembly[];     // Renamed for clarity in Firestore
  lastRuralWeekendLeadingGroupId?: string | null; // Can be null
  updatedAt?: Timestamp; // General timestamp for the settings document
}


export interface CasaAvailability {
 availableProgramSlotIds?: string[]; // Array of ProgramScheduleSlot IDs
}

export interface UserAvailability {
  availableSlotIds?: string[];
  general?: CasaAvailability; // This nested 'general' seems legacy, consider if needed.
}

export interface UnavailabilityPeriod {
  id: string; // For React key, can be UUID
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  reason?: string;
}

export interface Casa {
  id: string;
  ownerName: string;
  address: string;
  phoneNumber?: string;
  availableDays?: CasaAvailability; 
  isBlocked: boolean;
  blockReason?: string; // New field for block reason
  notes?: string;
  notesForSS?: string; // New field for SS notes
  isSuitableForRural?: boolean;
  addedByGroupId?: string; // FK to preachingGroups, group that owns/manages this casa
  unavailabilityPeriods?: UnavailabilityPeriod[];

  lastVisitedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export type TerritoryType = "urban" | "rural";

export interface Territory {
  id: string;
  number?: string;
  name: string;
  type: TerritoryType;
  mapImageUrl?: string;
  dataAiHint?: string; // For Unsplash hints if mapImageUrl is a placeholder
  googleMapsLink?: string;
  lastWorked?: string; // Consider making this a Timestamp for easier querying
  totalBlocks?: number;
  blockHouseCounts?: number[];
  approxHouseCount?: number;
  doNotCallAddresses?: string[];
  warnings?: string[];
  isBlocked: boolean;
  blockReason?: string; // New field for block reason
  unblockDate?: Timestamp;
  groupIds?: string[];
  associatedCasaIds?: string[];
  blockIds?: string[]; // Optional: if blocks have specific IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface PreachingGroup {
  id: string;
  name: string;
  description?: string;
  superintendentId?: string; // Firebase Auth UID
  auxiliaryId?: string; // Firebase Auth UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

// Type for an assignment entry, generalized for both user view and admin view
export type PreachingAssignedType = "publica" | "rural" | "zoom";
export type AssignmentStatus = "pending" | "accepted" | "rejected" | "replacement_requested" | "replacement_covered" | "cancelled_by_admin" | "needs_manual_replacement";

// For reporting worked assignments

export interface SingleTerritoryReportDetails {
  territoryId: string;
  territoryName: string; // To display in summary/history
  territoryNotWorked?: boolean;
  workedBlocksIds: string[];
}

export interface ReportedAssignmentData {
  assignmentId: string;
  reports: SingleTerritoryReportDetails[]; // Array to hold report for main and additional territory
  generalNotes?: string; // General notes for the overall preaching activity
  reportedAt: Timestamp;
  reportedByUserId: string;
  additionalTerritorySelected?: boolean;
}

export interface AdditionalTerritoryInfo {
  id: string;
  name: string;
  number?: string;
  type: TerritoryType;
  mapImageUrl?: string;
  totalBlocks?: number;
  dataAiHint?: string;
  isPartial?: boolean;
  blockHouseCounts?: number[];
  approxHouseCount?: number;
  pendingBlockNumbers?: number[];
  approxPendingHousesCount?: number;
}

export interface UserAssignment {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  type: PreachingAssignedType;
  locationName: string; // Nombre del territorio o casa principal
  locationId?: string; // ID del territorio o casa principal (para cargar detalles)
  status: AssignmentStatus;
  assignedBy?: string; // Admin or AI
  notes?: string;
  additionalTerritorySelected?: AdditionalTerritoryInfo; // Info about the selected additional territory
  lastReportData?: ReportedAssignmentData;
}

export interface Assignment extends UserAssignment {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhoneNumber?: string; // Added for WhatsApp reminder
  captainId?: string;
  assignedGroupId?: string;
  casaAddress?: string;
  territoryName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


// For "Mi Grupo > Programa"
export interface GroupAssignment {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  preachingType: PreachingType; // Now directly set by SG
  time: string; // HH:MM - Now directly set by SG
  captainUserId: string; // Firebase Auth UID of a publisher from the group
  captainName?: string; // For display
  casaId?: string; // ID of a Casa associated with the group
  casaName?: string; // For display
  assignedTerritoryId?: string; // ID of the Territory assigned for this slot
  assignedTerritoryName?: string; // Name of the Territory for display
  notes?: string;
  createdAt: Timestamp;
  createdBy: string; // Firebase Auth UID of the SG who created it
}

    
