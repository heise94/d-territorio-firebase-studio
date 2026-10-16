import { CampaignProgram } from "@/modules/campaigns/components/campaign-program";
import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <AdminDesktopShell campaignId={campaignId}><CampaignProgram campaignId={campaignId} /></AdminDesktopShell>;
}
