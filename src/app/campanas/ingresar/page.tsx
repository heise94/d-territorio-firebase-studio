import { redirect } from "next/navigation";
import { ParticipantAuthForm } from "@/modules/campaigns/components/participant-auth-form";
import { getCurrentParticipant } from "@/modules/campaigns/server/auth/session";

export const dynamic = "force-dynamic";
export default async function ParticipantLoginPage() {
  if (await getCurrentParticipant()) redirect("/campanas");
  return <ParticipantAuthForm />;
}
