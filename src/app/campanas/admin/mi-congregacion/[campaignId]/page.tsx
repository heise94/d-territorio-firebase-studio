import { CongregationReview } from "@/modules/campaigns/components/congregation-review";
import { AdminDesktopShell } from "@/modules/campaigns/components/admin-desktop-shell";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <AdminDesktopShell campaignId={campaignId}><CongregationReview campaignId={campaignId} /></AdminDesktopShell>;
}
