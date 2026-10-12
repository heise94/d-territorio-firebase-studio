import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
import { CampaignEditorPage } from "@/modules/campaigns/components/campaign-editor-page";
export default async function Page({params}:{params:Promise<{campaignId:string}>}){const {campaignId}=await params;return <AdminDesktopShell campaignId={campaignId}><CampaignEditorPage campaignId={campaignId}/></AdminDesktopShell>}
