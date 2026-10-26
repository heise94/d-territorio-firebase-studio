import "server-only";
import { getAuth } from "firebase-admin/auth";
import { AuthError } from "./auth/service";
import { campaignsAdminApp, campaignsAdminDb } from "./firebase-admin";
import { campaignCollections } from "../lib/paths";

/** Existing Firebase Auth and claim, including current user record; never participant cookie. */
export async function authorizeCampaignDashboard(idToken: string) {
  if (!idToken || idToken.length > 8192)
    throw new AuthError(401, "Ingresa con tu cuenta administrativa.");
  try {
    const auth = getAuth(campaignsAdminApp());
    // Phone + PIN administration exchanges the participant session for a scoped
    // custom token. Both markers are set only by that protected exchange, so a
    // revoked persistent organizer claim still takes effect for normal accounts.
    const decoded = await auth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const user = await getAuth(campaignsAdminApp()).getUser(uid);
    const grant = await campaignsAdminDb()
      .collection(campaignCollections.organizerUsers)
      .where("uid", "==", uid)
      .get();
    const hasActiveGrant = grant.docs.some((doc) => {
      const row = doc.data();
      return (
        row.active === true &&
        ["SUPER_ADMIN", "CAMPAIGN_ADMIN"].includes(row.role)
      );
    });
    if (
      user.disabled ||
      (user.customClaims?.campaign_admin !== true &&
        !(decoded.campaign_admin === true && decoded.campaign_participant_admin === true) &&
        !hasActiveGrant)
    )
      throw new AuthError(
        403,
        "Tu cuenta no tiene autorización administrativa de Campañas.",
      );
    return uid;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (
      error instanceof Error &&
      error.message === "Organizer authorization required"
    )
      throw new AuthError(
        403,
        "Tu cuenta no tiene autorización administrativa de Campañas.",
      );
    const code = (error as { code?: string })?.code;
    if (code?.startsWith("auth/") && code !== "auth/internal-error")
      throw new AuthError(
        401,
        "Tu sesión administrativa no es válida. Ingresa nuevamente.",
      );
    throw new AuthError(
      503,
      "No pudimos verificar tu autorización. Intenta nuevamente.",
    );
  }
}
