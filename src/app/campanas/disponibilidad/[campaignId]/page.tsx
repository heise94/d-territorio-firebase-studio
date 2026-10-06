import Link from "next/link";
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
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 pb-28 pt-8">
      <Link
        href="/campanas/disponibilidad"
        prefetch={false}
        className="inline-flex min-h-12 items-center text-teal-800 underline"
      >
        Volver a campañas
      </Link>
      <AvailabilityForm campaignId={campaignId} />
      <ParticipantNavigation active="Disponibilidad" />
    </main>
  );
}
