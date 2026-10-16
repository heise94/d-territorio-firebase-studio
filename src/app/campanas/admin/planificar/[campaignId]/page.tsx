import { CampaignPlanner } from "@/modules/campaigns/components/campaign-planner";
import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <AdminDesktopShell campaignId={campaignId}><CampaignPlanner campaignId={campaignId} /></AdminDesktopShell>;
}
