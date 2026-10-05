import { CampaignProgram } from "@/modules/campaigns/components/campaign-program";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return <CampaignProgram campaignId={(await params).campaignId} />;
}
