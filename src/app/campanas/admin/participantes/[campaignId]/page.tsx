import { CampaignAdminDashboard } from "@/modules/campaigns/components/admin-dashboard";
import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <AdminDesktopShell campaignId={campaignId}><CampaignAdminDashboard campaignId={campaignId} /></AdminDesktopShell>;
}
