import { CampaignChanges } from "@/modules/campaigns/components/campaign-changes";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return <CampaignChanges campaignId={(await params).campaignId} />;
}
