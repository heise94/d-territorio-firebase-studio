import { notFound } from "next/navigation";
import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { AvailabilityForm } from "@/modules/campaigns/components/availability-form";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { campaignDocumentIdSchema } from "@/modules/campaigns/schemas/registration-schemas";
export const dynamic = "force-dynamic";
export default async function CampaignAvailabilityDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  await requireParticipantSession();
  const { campaignId } = await params;
  if (!campaignDocumentIdSchema.safeParse(campaignId).success) notFound();
  return (
    <main className="campaign-page space-y-6">
      <AvailabilityForm campaignId={campaignId} />
      <ParticipantNavigation active="Disponibilidad" />
    </main>
  );
}
