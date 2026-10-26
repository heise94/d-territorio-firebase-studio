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
 * Team helpers are explicit, campaign-scoped administrators. Their membership
 * is revocable from the campaign team and never grants platform permissions.
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
    if (typeof campaignId !== "string") continue;
    const team = (
      await db.collection(campaignCollections.campaignTeams).doc(campaignId).get()
    ).data() as
      | { primaryRegistrationId?: string | null; helperRegistrationIds?: string[] }
      | undefined;
    const isPrimary = team?.primaryRegistrationId === registration.id;
    const isHelper = team?.helperRegistrationIds?.includes(registration.id) === true;
    if ((isPrimary && allowedCampaignIds.has(campaignId)) || isHelper)
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
  // Verified identity plus an active Firestore role/team membership is the
  // authority. Claims can lag behind a recently granted or revoked role.
  const grants = await db
    .collection(campaignCollections.organizerUsers)
    .where("uid", "==", identity.uid)
    .get();
  const rows = grants.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OrganizerUser);
  const authorized = (row: OrganizerUser) =>
    row.active === true && allowed.includes(row.role) &&
    (row.role === "SUPER_ADMIN" || row.campaignId === campaignId);
  // Preserve the strongest explicit role when an account also has a
  // campaign-scoped grant. Otherwise callers that allow capacity exceptions
  // could accidentally receive CAMPAIGN_ADMIN due to Firestore row order.
  const match =
    rows.find((row) => row.role === "SUPER_ADMIN" && authorized(row)) ??
    rows.find(authorized);
  if (!match) {
    if (allowed.includes("CAMPAIGN_ADMIN")) {
      const registration = await db
        .collection(campaignCollections.campaignRegistrations)
        .where("participantId", "==", identity.uid)
        .get();
      const member = registration.docs.find((doc) =>
        doc.data().campaignId === campaignId && doc.data().registrationStatus === "active",
      );
      if (member) {
        const [teamDoc, profileDoc] = await Promise.all([
          db.collection(campaignCollections.campaignTeams).doc(campaignId).get(),
          db.collection(campaignCollections.participants).doc(identity.uid).get(),
        ]);
        const team = teamDoc.data() as { helperRegistrationIds?: string[] } | undefined;
        if (
          profileDoc.data()?.active === true &&
          team?.helperRegistrationIds?.includes(member.id)
        )
          return { uid: identity.uid, role: "CAMPAIGN_ADMIN", campaignId };
      }
    }
    throw new AuthError(403, "No tienes acceso a esta campaña.");
  }
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
