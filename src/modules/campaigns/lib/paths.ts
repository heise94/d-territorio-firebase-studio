export const campaignCollections = {
  campaigns: 'campaigns',
  campaignDays: 'campaignDays',
  timeBlocks: 'timeBlocks',
  congregations: 'campaignCongregations',
  participants: 'campaignParticipants',
  registrations: 'campaignRegistrations',
  availability: 'campaignAvailability',
  pairRequests: 'campaignPairRequests',
  points: 'campaignPoints',
  blockPoints: 'campaignBlockPoints',
  assignments: 'campaignAssignments',
  changeRequests: 'campaignChangeRequests',
  notifications: 'campaignNotifications',
  deviceSessions: 'campaignDeviceSessions',
  pushSubscriptions: 'campaignPushSubscriptions',
  organizerNotes: 'campaignOrganizerNotes',
  auditLogs: 'campaignAuditLogs',
} as const;

export type CampaignCollectionKey = keyof typeof campaignCollections;
