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
    return { uid: decoded.uid, superAdmin: user.customClaims?.super_admin === true, campaignAdmin: user.customClaims?.campaign_admin === true };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(401, "Tu sesión administrativa no es válida. Ingresa nuevamente.");
  }
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
    "CONGREGATION_RESPONSIBLE",
  ]);
}
