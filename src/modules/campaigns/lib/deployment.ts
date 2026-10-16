/** Pure validation. Errors contain variable names only, never their values. */
export type DeploymentEnvironment = Readonly<
  Record<string, string | undefined>
>;
export function deploymentErrors(env: DeploymentEnvironment): string[] {
  const errors: string[] = [];
  const required = [
    "CAMPAIGNS_APP_ORIGIN",
    "FIREBASE_ADMIN_PROJECT_ID",
    "CAMPAIGNS_STAGING_PROJECT_ID",
    "CAMPAIGNS_PRODUCTION_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "CAMPAIGNS_TIME_ZONE",
    "NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE",
  ];
  if (!["staging", "production"].includes(env.CAMPAIGNS_ENV ?? ""))
    errors.push("CAMPAIGNS_ENV");
  for (const key of required) if (!env[key]?.trim()) errors.push(key);
  for (const key of [
    "CAMPAIGNS_AUTH_SECRET",
    "CAMPAIGNS_NOTIFICATION_JOB_SECRET",
  ])
    if ((env[key]?.length ?? 0) < 32) errors.push(key);
  try {
    const origin = new URL(env.CAMPAIGNS_APP_ORIGIN ?? "");
    if (
      origin.protocol !== "https:" ||
      origin.origin !== env.CAMPAIGNS_APP_ORIGIN ||
      origin.username ||
      origin.password ||
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
      errors.push("CAMPAIGNS_APP_ORIGIN");
  } catch {
    errors.push("CAMPAIGNS_APP_ORIGIN");
  }
  const project =
    env.CAMPAIGNS_ENV === "staging"
      ? env.CAMPAIGNS_STAGING_PROJECT_ID
      : env.CAMPAIGNS_PRODUCTION_PROJECT_ID;
  if (
    !project ||
    project.startsWith("demo-") ||
    project !== env.FIREBASE_ADMIN_PROJECT_ID ||
    project !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
    errors.push("Firebase project isolation");
  if (env.CAMPAIGNS_STAGING_PROJECT_ID === env.CAMPAIGNS_PRODUCTION_PROJECT_ID)
    errors.push("Distinct staging/production projects");
  for (const key of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"])
    if (env[key]) errors.push(key);
  const email = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const key = env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (Boolean(email) !== Boolean(key))
    errors.push("Complete Firebase Admin credentials");
  for (const key of [
    "CAMPAIGNS_TIME_ZONE",
    "NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE",
  ]) {
    try {
      if (!env[key]) throw new Error();
      new Intl.DateTimeFormat("es", { timeZone: env[key] });
    } catch {
      errors.push(key);
    }
  }
  if (env.CAMPAIGNS_TIME_ZONE !== env.NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE)
    errors.push("Matching time zones");
  for (const key of [
    "CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT",
    "CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT",
  ]) {
    if (
      env[key] !== undefined &&
      (!/^\d+$/.test(env[key]!) ||
        Number(env[key]) < 1 ||
        Number(env[key]) > 10000)
    )
      errors.push(key);
  }
  return [...new Set(errors)];
}

export function requireDeploymentEnvironment(env: DeploymentEnvironment) {
  const errors = deploymentErrors(env);
  if (errors.length)
    throw new Error(
      `Campaign deployment configuration invalid: ${errors.join(", ")}`,
    );
}
