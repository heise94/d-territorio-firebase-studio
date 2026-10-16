import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { campaignDocumentIdSchema } from "@/modules/campaigns/schemas/registration-schemas";
import { PairRequests } from "@/modules/campaigns/components/pair-requests";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
export const dynamic = "force-dynamic";
export default async function PairRequestsPage({
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
        prefetch={false}
        href="/campanas"
        className="inline-flex min-h-12 items-center text-teal-800 underline"
      >
        Volver a Inicio
      </Link>
      <PairRequests campaignId={campaignId} />
      <ParticipantNavigation active="Disponibilidad" />
    </main>
  );
}
