import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { NotificationCenter } from "@/modules/campaigns/components/notification-center";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
export const dynamic = "force-dynamic";
export default async function NoticesPage() {
  await requireParticipantSession();
  return (
    <main className="mx-auto max-w-md space-y-6 px-5 pb-28 pt-8">
      <h1 className="text-3xl font-bold">Avisos</h1>
      <NotificationCenter />
      <ParticipantNavigation active="Avisos" />
    </main>
  );
}
