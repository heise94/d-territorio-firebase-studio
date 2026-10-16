import { NotificationSummary } from "../../../../../src/modules/campaigns/components/notification-center";
import { ParticipantNextTurn } from "../../../../../src/modules/campaigns/components/next-turn";
import { ParticipantNavigation } from "../../../../../src/modules/campaigns/components/participant-navigation";
import { ParticipantSessionControls } from "../../../../../src/modules/campaigns/components/participant-session";
import { PushSettings } from "../../../../../src/modules/campaigns/components/push-settings";
export default function Home() {
  return (
    <main className="mx-auto max-w-md space-y-5 p-5 pb-28">
      <p>QA local — datos ficticios</p>
      <h1 className="text-2xl font-bold">Campañas</h1>
      <NotificationSummary />
      <ParticipantNextTurn />
      <PushSettings />
      <ParticipantSessionControls fullName="Participante ficticio" />
      <ParticipantNavigation active="Inicio" />
    </main>
  );
}
