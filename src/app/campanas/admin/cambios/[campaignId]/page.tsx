import { CampaignChanges } from "@/modules/campaigns/components/campaign-changes";
import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <AdminDesktopShell campaignId={campaignId}><CampaignChanges campaignId={campaignId} /></AdminDesktopShell>;
}
