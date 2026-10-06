import { CampaignAdminDashboard } from "@/modules/campaigns/components/admin-dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return <CampaignAdminDashboard campaignId={(await params).campaignId} />;
}
