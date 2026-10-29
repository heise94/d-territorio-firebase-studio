import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "firebase-admin/auth";
import { campaignsAdminApp, campaignsAdminDb, requireCampaignOrganizer } from "../firebase-admin";
import { ParticipantAuthService } from "./service";
import { SESSION_SECONDS } from "./crypto";

export const SESSION_COOKIE = "campaign_participant_session";
export const cookieOptions = (
  expires = new Date(Date.now() + SESSION_SECONDS * 1000),
) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});
let service: ParticipantAuthService | undefined;
export function participantAuth() {
  return (service ??= new ParticipantAuthService(
    campaignsAdminDb(),
    process.env.CAMPAIGNS_AUTH_SECRET ?? "",
  ));
}
export async function getCurrentParticipant() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await participantAuth().current(token))?.participant ?? null;
}
export async function requireParticipantSession() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/campanas/bienvenida");
  if (participant.mustChangePin) redirect("/campanas/cambiar-pin");
  return participant;
}

export async function revokeParticipantAdminSessions(participantId: string) {
  const auth = getAuth(campaignsAdminApp());
  try { await auth.getUser(participantId); }
  catch (error) { if ((error as { code?: string }).code === "auth/user-not-found") return; throw error; }
  await auth.revokeRefreshTokens(participantId);
}

// Admin recovery is deliberately a service, not a new administration panel.
// The organizer must confirm identity outside the app; the participant chooses the new PIN.
export async function resetParticipantPin(idToken: string, input: unknown) {
  const uid = await requireCampaignOrganizer(idToken);
  return participantAuth().resetPin(input, uid);
}
export async function revokeParticipantSessions(
  idToken: string,
  participantId: string,
) {
  const uid = await requireCampaignOrganizer(idToken);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(participantId))
    throw new Error("Invalid participant id");
  await participantAuth().limit("revoke-organizer", uid, 10);
  return participantAuth().revokeAll(participantId);
}
