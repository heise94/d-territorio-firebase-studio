import { CampaignPlanner } from "@/modules/campaigns/components/campaign-planner";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return <CampaignPlanner campaignId={(await params).campaignId} />;
}
