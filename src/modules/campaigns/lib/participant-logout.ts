import { campaignFetch } from "./campaign-fetch";

export const participantLogoutDestination = "/campanas/bienvenida";
export async function logoutParticipant(
  clearClient: () => void,
  replace: (route: string) => void,
) {
  const response = await campaignFetch("/api/campanas/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(
      body.error ?? "No pudimos cerrar la sesión. Inténtalo nuevamente.",
    );
  }
  // Only clear local identity after the server has invalidated the HttpOnly session.
  try {
    clearClient();
  } finally {
    // A browser lacking messaging support must still leave the authenticated page.
    replace(participantLogoutDestination);
  }
}
