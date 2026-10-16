import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { PairInbox } from "@/modules/campaigns/components/pair-inbox";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
export const dynamic = "force-dynamic";
export default async function PairInboxPage() {
  await requireParticipantSession();
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 pb-28 pt-8">
      <h1 className="text-2xl font-bold">Solicitudes pendientes</h1>
      <PairInbox expanded />
      <ParticipantNavigation active="Inicio" />
    </main>
  );
}
