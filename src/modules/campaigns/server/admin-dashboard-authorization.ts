import "server-only";
import { getAuth } from "firebase-admin/auth";
import { AuthError } from "./auth/service";
import { campaignsAdminApp, requireCampaignOrganizer } from "./firebase-admin";

/** Existing Firebase Auth and claim, including current user record; never participant cookie. */
export async function authorizeCampaignDashboard(idToken: string) {
  if (!idToken || idToken.length > 8192)
    throw new AuthError(401, "Ingresa con tu cuenta administrativa.");
  try {
    const uid = await requireCampaignOrganizer(idToken);
    const user = await getAuth(campaignsAdminApp()).getUser(uid);
    if (user.disabled || user.customClaims?.campaign_admin !== true)
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
