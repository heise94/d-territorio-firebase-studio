import { ParticipantInformationView } from "@/modules/campaigns/components/participant-information";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
export const dynamic = "force-dynamic";
export default async function Page() { await requireParticipantSession(); return <main className="campaign-page"><ParticipantInformationView /><ParticipantNavigation active="Información" /></main>; }
