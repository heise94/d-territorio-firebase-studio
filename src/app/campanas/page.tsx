import Link from "next/link";
import { Megaphone } from "lucide-react";
import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { ParticipantSessionControls } from "@/modules/campaigns/components/participant-session";
import { ParticipantCampaigns } from "@/modules/campaigns/components/participant-campaigns";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";

export const dynamic = "force-dynamic";
export default async function CampaignParticipantPage() {
  const participant = await requireParticipantSession();
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 pb-28 pt-8">
      <header className="flex items-center gap-3">
        <Megaphone className="h-7 w-7 text-teal-700" aria-hidden="true" />
        <div>
          <p className="font-semibold text-teal-700">D-Territorio</p>
          <h1 className="text-2xl font-bold">Campañas</h1>
        </div>
      </header>
      <ParticipantSessionControls fullName={participant.fullName} />
      <p className="leading-7">
        Elige una campaña, indica cuántos turnos deseas realizar y marca los
        horarios en que puedes participar.
      </p>
      <ParticipantCampaigns />
      <Link
        href="/campanas/admin"
        prefetch={false}
        className="inline-flex min-h-12 items-center text-teal-800 underline"
      >
        Acceso organizadores
      </Link>
      <ParticipantNavigation active="Inicio" />
    </main>
  );
}
