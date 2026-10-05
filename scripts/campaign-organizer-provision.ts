import {
  applicationDefault,
  initializeApp,
  deleteApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function provisioningArguments(args: string[]) {
  const allowed = new Set([
    "--project",
    "--uid",
    "--confirm-project",
    "--apply",
  ]);
  const values: Record<string, string> = {};
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!allowed.has(key) || key in values || (key === "--apply" && apply))
      throw new Error("Invalid arguments");
    if (key === "--apply") {
      apply = true;
      continue;
    }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error("Missing argument");
    values[key] = value;
  }
  const project = values["--project"],
    uid = values["--uid"];
  if (
    !project ||
    !/^[a-z][a-z0-9-]{4,62}$/.test(project) ||
    !uid ||
    uid.length > 128
  )
    throw new Error("Explicit project and UID required");
  if (apply && values["--confirm-project"] !== project)
    throw new Error("Explicit project confirmation required");
  return { project, uid, apply };
}

async function main() {
  const { project, uid, apply } = provisioningArguments(process.argv.slice(2));
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST
  )
    throw new Error("Provisioning requires real Auth, not an emulator");
  const app = initializeApp(
    { projectId: project, credential: applicationDefault() },
    "organizer-provisioning",
  );
  try {
    const auth = getAuth(app),
      user = await auth.getUser(uid);
    if (user.disabled) throw new Error("Account is disabled");
    if (!apply) {
      console.log(
        JSON.stringify({
          dryRun: true,
          project,
          campaign_admin: user.customClaims?.campaign_admin === true,
        }),
      );
      return;
    }
    // Read again immediately before mutation; preserve unrelated claims.
    const latest = await auth.getUser(uid);
    if (latest.disabled) throw new Error("Account is disabled");
    await auth.setCustomUserClaims(uid, {
      ...latest.customClaims,
      campaign_admin: true,
    });
    const verified = await auth.getUser(uid);
    if (verified.customClaims?.campaign_admin !== true)
      throw new Error("Claim verification failed");
    console.log(
      JSON.stringify({
        applied: true,
        project,
        campaign_admin: true,
        refreshIdTokenRequired: true,
      }),
    );
  } finally {
    await deleteApp(app);
  }
}
if (process.argv[1]?.endsWith("campaign-organizer-provision.ts"))
  main().catch(() => {
    console.error(
      "Organizer provisioning failed; inspect access, project, UID and confirmation privately.",
    );
    process.exitCode = 1;
  });
