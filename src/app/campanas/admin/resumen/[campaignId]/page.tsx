import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
import { CampaignSummary } from "@/modules/campaigns/components/campaign-summary";
export default async function Page({params}:{params:Promise<{campaignId:string}>}){const {campaignId}=await params;return <AdminDesktopShell campaignId={campaignId}><CampaignSummary campaignId={campaignId}/></AdminDesktopShell>}
