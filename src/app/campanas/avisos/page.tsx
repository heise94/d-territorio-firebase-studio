import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { NotificationCenter } from "@/modules/campaigns/components/notification-center";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { PairInbox } from "@/modules/campaigns/components/pair-inbox";
export const dynamic = "force-dynamic";
export default async function NoticesPage() {
  await requireParticipantSession();
  return (
    <main className="campaign-page space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Avisos</h1>
      <PairInbox expanded />
      <NotificationCenter />
      <ParticipantNavigation active="Avisos" />
    </main>
  );
}
