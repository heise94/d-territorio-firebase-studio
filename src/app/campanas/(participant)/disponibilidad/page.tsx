import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { ParticipantCampaigns } from "@/modules/campaigns/components/participant-campaigns";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
export const dynamic = "force-dynamic";
export default async function CampaignAvailabilityPage() {
  await requireParticipantSession();
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 pb-28 pt-8">
      <h1 className="text-2xl font-bold">Mi disponibilidad</h1>
      <p>Elige una campaña para inscribirte o revisar tus horarios.</p>
      <ParticipantCampaigns />
      <ParticipantNavigation active="Disponibilidad" />
    </main>
  );
}
