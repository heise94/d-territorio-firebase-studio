/** Server-side administrative roles. They are never inferred from the UI. */
export type OrganizerRole =
  | "SUPER_ADMIN"
  | "CAMPAIGN_ADMIN"
  | "CONGREGATION_RESPONSIBLE";

export interface OrganizerUser {
  id: string;
  uid: string;
  role: OrganizerRole;
  active: boolean;
  /** Required for campaign-scoped operational roles. */
  campaignId?: string;
  /** Required only for CONGREGATION_RESPONSIBLE. */
  congregationId?: string;
}

export type CampaignAccess = {
  uid: string;
  role: OrganizerRole;
  campaignId: string;
  congregationId?: string;
};
