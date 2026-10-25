import "server-only";
import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { CampaignAccess, OrganizerRole, OrganizerUser } from "../domain/organizer";
import { campaignCollections } from "../lib/paths";
import { AuthError } from "./auth/service";
import { campaignsAdminApp } from "./firebase-admin";

async function verifiedUid(idToken: string) {
  if (!idToken || idToken.length > 8192)
    throw new AuthError(401, "Ingresa con tu cuenta administrativa.");
  try {
    const decoded = await getAuth(campaignsAdminApp()).verifyIdToken(idToken, true);
    const user = await getAuth(campaignsAdminApp()).getUser(decoded.uid);
    if (user.disabled) throw new AuthError(403, "La cuenta administrativa está desactivada.");
    // Participant organizers authenticate with a Firebase custom token issued
    // only after their phone + PIN session has been verified server-side. The
    // token carries the scoped campaign admission; the Firestore grant below
    // remains the authority for the campaign and role.
    return {
      uid: decoded.uid,
      superAdmin:
        decoded.super_admin === true || user.customClaims?.super_admin === true,
      campaignAdmin:
        decoded.campaign_admin === true ||
        user.customClaims?.campaign_admin === true,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(401, "Tu sesión administrativa no es válida. Ingresa nuevamente.");
  }
}

/**
 * Finds the single campaign that a phone/PIN participant may administer.
 * A team membership alone is deliberately insufficient: an explicit,
 * revocable CAMPAIGN_ADMIN grant is also required.
 */
export async function participantCampaignAdminAccess(
  db: Firestore,
  participantId: string,
) {
  const [grants, registrations] = await Promise.all([
    db
      .collection(campaignCollections.organizerUsers)
      .where("uid", "==", participantId)
      .get(),
    db
      .collection(campaignCollections.campaignRegistrations)
      .where("participantId", "==", participantId)
      .get(),
  ]);
  const superAdmin = grants.docs
    .map((doc) => doc.data() as OrganizerUser)
    .some((grant) => grant.active === true && grant.role === "SUPER_ADMIN");
  const allowedCampaignIds = new Set(
    grants.docs
      .map((doc) => doc.data() as OrganizerUser)
      .filter(
        (grant) =>
          grant.active === true &&
          grant.role === "CAMPAIGN_ADMIN" &&
          typeof grant.campaignId === "string",
      )
      .map((grant) => grant.campaignId!),
  );
  for (const registration of registrations.docs) {
    const campaignId = registration.data().campaignId;
    if (typeof campaignId !== "string" || !allowedCampaignIds.has(campaignId))
      continue;
    const team = (
      await db.collection(campaignCollections.campaignTeams).doc(campaignId).get()
    ).data() as
      | { primaryRegistrationId?: string | null; helperRegistrationIds?: string[] }
      | undefined;
    if (
      team?.primaryRegistrationId === registration.id ||
      team?.helperRegistrationIds?.includes(registration.id)
    )
      return { campaignId, superAdmin };
  }
  return null;
}

/**
 * Resolves an explicitly provisioned campaign role. A Firebase claim alone is
 * deliberately insufficient for congregation-private data.
 */
export async function requireCampaignAccess(
  db: Firestore,
  idToken: string,
  campaignId: string,
  allowed: OrganizerRole[],
): Promise<CampaignAccess> {
  const identity = await verifiedUid(idToken);
  // The scoped document is authoritative for *where* access applies. The
  // revocable Firebase claim remains the global administrative admission gate.
  if (!identity.campaignAdmin && !identity.superAdmin)
    throw new AuthError(403, "Tu cuenta no tiene autorización administrativa de Campañas.");
  if (identity.superAdmin && allowed.includes("SUPER_ADMIN"))
    return { uid: identity.uid, role: "SUPER_ADMIN", campaignId };
  const grants = await db
    .collection(campaignCollections.organizerUsers)
    .where("uid", "==", identity.uid)
    .get();
  const rows = grants.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OrganizerUser);
  const match = rows.find((row) =>
    row.active === true && allowed.includes(row.role) &&
    (row.role === "SUPER_ADMIN" || row.campaignId === campaignId),
  );
  if (!match)
    throw new AuthError(403, "No tienes acceso a esta campaña.");
  if (match.role === "CONGREGATION_RESPONSIBLE" && !match.congregationId)
    throw new AuthError(403, "La responsabilidad de congregación no está configurada.");
  return {
    uid: identity.uid,
    role: match.role,
    campaignId,
    ...(match.congregationId ? { congregationId: match.congregationId } : {}),
  };
}

export async function campaignAccessForNavigation(
  db: Firestore,
  idToken: string,
  campaignId: string,
) {
  return requireCampaignAccess(db, idToken, campaignId, [
    "SUPER_ADMIN",
    "CAMPAIGN_ADMIN",
  ]);
}
