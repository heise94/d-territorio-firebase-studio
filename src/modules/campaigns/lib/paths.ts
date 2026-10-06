export const campaignCollections = {
  campaigns: "campaigns",
  campaignDays: "campaignDays",
  timeBlocks: "timeBlocks",
  congregations: "congregations",
  campaignCongregations: "campaignCongregations",
  participants: "participants",
  campaignRegistrations: "campaignRegistrations",
  availabilities: "availabilities",
  pairRequests: "pairRequests",
  points: "points",
  blockPoints: "blockPoints",
  assignments: "campaignAssignments",
  changeRequests: "changeRequests",
  notifications: "campaignNotifications",
  deviceSessions: "deviceSessions",
  pushSubscriptions: "pushSubscriptions",
  organizerUsers: "organizerUsers",
  organizerNotes: "organizerNotes",
  auditLogs: "auditLogs",
  programVersions: "campaignProgramVersions",
} as const;

export type CampaignCollectionKey = keyof typeof campaignCollections;
