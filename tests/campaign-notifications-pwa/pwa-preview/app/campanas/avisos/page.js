import { NotificationCenter } from "../../../../../../src/modules/campaigns/components/notification-center";
import { ParticipantNavigation } from "../../../../../../src/modules/campaigns/components/participant-navigation";
export default function Notices() {
  return (
    <main className="mx-auto max-w-md space-y-5 p-5 pb-28">
      <h1 className="text-2xl font-bold">Avisos</h1>
      <NotificationCenter />
      <ParticipantNavigation active="Avisos" />
    </main>
  );
}
