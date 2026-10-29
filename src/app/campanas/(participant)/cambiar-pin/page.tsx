import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { participantAuth, SESSION_COOKIE } from "@/modules/campaigns/server/auth/session";
import { ParticipantChangeRequiredPin } from "@/modules/campaigns/components/participant-change-required-pin";

export default async function Page() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const current = token ? await participantAuth().current(token) : null;
  if (!current) redirect("/campanas/ingresar");
  if (!current.participant.mustChangePin) redirect("/campanas");
  return <ParticipantChangeRequiredPin />;
}
