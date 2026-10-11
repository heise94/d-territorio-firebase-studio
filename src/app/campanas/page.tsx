import { CircleUserRound } from "lucide-react";
import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { ParticipantCampaigns } from "@/modules/campaigns/components/participant-campaigns";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { PairInbox } from "@/modules/campaigns/components/pair-inbox";
import { ParticipantNextTurn } from "@/modules/campaigns/components/next-turn";

export const dynamic = "force-dynamic";
export default async function CampaignParticipantPage() {
  await requireParticipantSession();
  return (
    <main className="campaign-page space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Inicio</h1>
        <span className="campaign-icon-surface rounded-full" aria-label="Tu perfil"><CircleUserRound className="h-7 w-7" /></span>
      </header>
      <PairInbox />
      <ParticipantNextTurn />
      <ParticipantCampaigns />
      <ParticipantNavigation active="Inicio" />
    </main>
  );
}
