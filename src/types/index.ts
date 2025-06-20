
import type { Timestamp } from 'firebase/firestore';
import type { UserRole, PermissionId } from '@/lib/constants';

export interface UserProfile {
  id: string; // doc ID from Firestore
  name: string;
  email: string; // unique
  phoneNumber?: string;
  role: UserRole;
  status: 'Activo' | 'Bloqueado' | 'Pendiente Aprobación Admin';
  blockReason?: string;
  assignedGroupId?: string; // FK to preachingGroups
  firebaseAuthUid?: string; // UID from Firebase Auth
  isBlockedForGeneralAI?: boolean;
  availability?: UserAvailability;
  addedByGroupId?: string;
  adminApprovalStatus?: 'pending' | 'approved';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Definición de PublisherDetail añadida
export interface PublisherDetail {
  id: string;
  name: string;
  email: string;
  // La estructura de availability debe coincidir con cómo se usa,
  // MOCK_AVAILABLE_PUBLISHERS en gestion-asignaciones/page.tsx usa:
  // availability: { availableSlotIds: string[] }
  availability: {
    availableSlotIds?: string[];
  };
  assignedGroupId?: string; // Basado en MOCK_GROUP_PUBLISHERS
  // phoneNumber?: string; // Podría añadirse si es necesario para el flujo
  // role?: UserRole; // Podría añadirse si es necesario
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
  type: PreachingType;
  status: ScheduleSlotStatus;
}

export type CampaignType = 'invitation' | 'superintendent_visit' | 'special';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  superintendentName?: string | null;
  specialCampaignTerritoriesPerDay?: number | null;
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CustomHoliday {
  id: string;
  name: string;
  date: Date | Timestamp;
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Assembly {
  id: string;
  name: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  description?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SettingsDoc {
  rolePermissions?: RoleConfiguration;
  programScheduleSlots?: ProgramScheduleSlot[];
  groupOrganizedDays?: DayOfWeek[];
  campaignsList?: Campaign[];
  holidaysList?: CustomHoliday[];
  assembliesList?: Assembly[];
  lastRuralWeekendLeadingGroupId?: string | null;
  updatedAt?: Timestamp;
}


export interface CasaAvailability {
 availableProgramSlotIds?: string[];
}

export interface UserAvailability {
  availableSlotIds?: string[];
  general?: CasaAvailability;
}

export interface UnavailabilityPeriod {
  id: string;
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
  blockReason?: string;
  notes?: string;
  notesForSS?: string;
  isSuitableForRural?: boolean;
  addedByGroupId?: string;
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
  dataAiHint?: string;
  googleMapsLink?: string;
  lastWorked?: string;
  totalBlocks?: number;
  blockHouseCounts?: number[];
  approxHouseCount?: number;
  doNotCallAddresses?: string[];
  warnings?: string[];
  isBlocked: boolean;
  blockReason?: string;
  unblockDate?: Timestamp;
  groupIds?: string[];
  associatedCasaIds?: string[];
  blockIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface PreachingGroup {
  id: string;
  name: string;
  description?: string;
  superintendentId?: string;
  auxiliaryId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export type PreachingAssignedType = "publica" | "rural" | "zoom";
export type AssignmentStatus = "pending" | "accepted" | "rejected" | "replacement_requested" | "replacement_covered" | "cancelled_by_admin" | "needs_manual_replacement";

export interface SingleTerritoryReportDetails {
  territoryId: string;
  territoryName: string;
  territoryNotWorked?: boolean;
  workedBlocksIds: string[];
}

export interface ReportedAssignmentData {
  assignmentId: string;
  reports: SingleTerritoryReportDetails[];
  generalNotes?: string;
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
  locationName: string;
  locationId?: string;
  status: AssignmentStatus;
  assignedBy?: string;
  notes?: string;
  additionalTerritorySelected?: AdditionalTerritoryInfo;
  lastReportData?: ReportedAssignmentData;
}

export interface Assignment extends UserAssignment {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhoneNumber?: string;
  captainId?: string;
  assignedGroupId?: string;
  casaAddress?: string;
  territoryName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GroupAssignment {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  preachingType: PreachingType;
  time: string; // HH:MM
  captainUserId: string;
  captainName?: string;
  casaId?: string;
  casaName?: string;
  assignedTerritoryId?: string;
  assignedTerritoryName?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}
