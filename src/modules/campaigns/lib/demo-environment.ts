/** Seeds remain local-only even when legitimate staging credentials exist. */
export function requireLocalCampaignDemo(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (
    env.NODE_ENV === "production" ||
    env.CAMPAIGNS_ENV ||
    env.FIREBASE_ADMIN_PROJECT_ID !== "demo-campaign-auth" ||
    !/^(localhost|127\.0\.0\.1):\d+$/.test(env.FIRESTORE_EMULATOR_HOST ?? "") ||
    !/^(localhost|127\.0\.0\.1):\d+$/.test(
      env.FIREBASE_AUTH_EMULATOR_HOST ?? "",
    )
  )
    throw new Error(
      "Campaign demo requires explicit demo-campaign-auth and local emulators",
    );
}
