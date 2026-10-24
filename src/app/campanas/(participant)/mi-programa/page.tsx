import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { PersonalProgramView } from "@/modules/campaigns/components/personal-program";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireParticipantSession();
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 pb-28 pt-8">
      <h1 className="text-2xl font-bold">Mi programa</h1>
      <PersonalProgramView />
      <ParticipantNavigation active="Mi programa" />
    </main>
  );
}
