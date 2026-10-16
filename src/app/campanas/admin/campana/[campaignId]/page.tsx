import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
import { CampaignEditorPage } from "@/modules/campaigns/components/campaign-editor-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ seccion?: string }>;
}) {
  const { campaignId } = await params;
  const requested = (await searchParams).seccion;
  const section =
    requested === "horarios" || requested === "informacion"
      ? requested
      : "general";
  return (
    <AdminDesktopShell campaignId={campaignId} section={section}>
      <CampaignEditorPage campaignId={campaignId} section={section} />
    </AdminDesktopShell>
  );
}
