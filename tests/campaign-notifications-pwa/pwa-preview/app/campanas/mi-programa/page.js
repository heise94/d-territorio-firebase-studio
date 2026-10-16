import { PersonalProgramView } from "../../../../../../src/modules/campaigns/components/personal-program";
import { ParticipantNavigation } from "../../../../../../src/modules/campaigns/components/participant-navigation";
export default function Program() {
  return (
    <main className="mx-auto max-w-md space-y-5 p-5 pb-28">
      <h1 className="text-2xl font-bold">Mi programa</h1>
      <PersonalProgramView />
      <ParticipantNavigation active="Mi programa" />
    </main>
  );
}
