export type CampaignId = string;
export type CampaignDayId = string;
export type TimeBlockId = string;
export type ParticipantId = string;
export type RegistrationId = string;
export type PointId = string;

export type CampaignStatus =
  | 'draft'
  | 'registration_open'
  | 'planning'
  | 'published'
  | 'active'
  | 'completed';

export interface CampaignSummary {
  id: CampaignId;
  name: string;
  description?: string;
  locationName?: string;
  status: CampaignStatus;
  maxPointsDefault?: number;
  defaultCapacityPerBlock?: number;
}

export interface CampaignDaySummary {
  id: CampaignDayId;
  campaignId: CampaignId;
  date: string;
  label?: string;
  active: boolean;
}

export interface TimeBlockSummary {
  id: TimeBlockId;
  campaignDayId: CampaignDayId;
  startTime: string;
  endTime: string;
  label?: string;
  capacityOverride?: number;
  active: boolean;
  sortOrder: number;
}
