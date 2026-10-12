import type { Timestamp } from "firebase/firestore";

export type CampaignId = string;
export type CampaignDayId = string;
export type TimeBlockId = string;
export type CongregationId = string;
export type CampaignCongregationId = string;
export type PointId = string;
export type BlockPointId = string;

export type CampaignStatus =
  | "draft"
  | "registration_open"
  | "planning"
  | "published"
  | "active"
  | "completed";

export interface Campaign {
  id: CampaignId;
  name: string;
  description?: string;
  locationName?: string;
  status: CampaignStatus;
  maxPointsDefault?: number;
  defaultCapacityPerBlock?: number;
  locationDetails?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  currentProgramVersionId?: string;
  programVersion?: number;
  publishedAt?: Timestamp;
  updatedProgramAt?: Timestamp;
  information?: CampaignInformation;
}

export interface CampaignContact {
  name: string;
  role?: string;
  phone: string;
  allowCall: boolean;
  allowWhatsApp: boolean;
}
export interface CampaignLogisticsInfo {
  location?: string;
  schedule?: string;
  instructions?: string;
  mapUrl?: string;
}
export interface CampaignInformation {
  intro?: string;
  generalMapUrl?: string;
  pickup?: CampaignLogisticsInfo;
  returnInfo?: CampaignLogisticsInfo;
  contacts?: CampaignContact[];
  notes?: { title: string; body?: string }[];
}

export interface CampaignDay {
  id: CampaignDayId;
  campaignId: CampaignId;
  date: string;
  label?: string;
  maxPointsOverride?: number;
  active: boolean;
  sortOrder: number;
}

export interface TimeBlock {
  id: TimeBlockId;
  campaignId: CampaignId;
  campaignDayId: CampaignDayId;
  startTime: string;
  endTime: string;
  label?: string;
  capacityOverride?: number;
  active: boolean;
  sortOrder: number;
}

export interface Congregation {
  id: CongregationId;
  name: string;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CampaignCongregation {
  id: CampaignCongregationId;
  campaignId: CampaignId;
  congregationId: CongregationId;
  coordinatorUserId?: string;
  /** Explicit operational owner for private registration review. */
  responsibleUserId?: string;
}

export interface Point {
  id: PointId;
  campaignId: CampaignId;
  name: string;
  description?: string;
  locationText?: string;
  mapUrl?: string;
  active: boolean;
  sortOrder: number;
}

export interface BlockPoint {
  id: BlockPointId;
  campaignId: CampaignId;
  timeBlockId: TimeBlockId;
  pointId: PointId;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
