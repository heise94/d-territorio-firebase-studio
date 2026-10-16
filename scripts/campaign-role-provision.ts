/** Explicit operator-only provisioning for server-side campaign roles. */
import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "node:crypto";

const roles = new Set(["SUPER_ADMIN", "CAMPAIGN_ADMIN", "CONGREGATION_RESPONSIBLE"]);
function argument(name: string, args: string[]) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
async function main(args: string[]) {
  const project = argument("--project", args), uid = argument("--uid", args), role = argument("--role", args);
  const campaignId = argument("--campaign", args), congregationId = argument("--congregation", args);
  if (!project || !uid || !role || !roles.has(role) || argument("--confirm-project", args) !== project)
    throw new Error("Explicit project, UID, role and matching confirmation are required.");
  if (role !== "SUPER_ADMIN" && !campaignId) throw new Error("Campaign role requires --campaign.");
  if (role === "CONGREGATION_RESPONSIBLE" && !congregationId) throw new Error("Responsible role requires --congregation.");
  const app = initializeApp({ projectId: project, credential: applicationDefault() }, "campaign-role-provisioning");
  try {
    const id = createHash("sha256").update(JSON.stringify([uid, role, campaignId ?? null, congregationId ?? null])).digest("hex");
    const row = { uid, role, active: true, ...(campaignId ? { campaignId } : {}), ...(congregationId ? { congregationId } : {}) };
    if (!args.includes("--apply")) { console.log(JSON.stringify({ dryRun: true, project, id, ...row })); return; }
    const user = await getAuth(app).getUser(uid);
    if (user.disabled) throw new Error("Administrative account is disabled.");
    await getFirestore(app).collection("organizerUsers").doc(id).set(row, { merge: true });
    // Legacy client guard still needs this coarse claim. Server authorization uses
    // the scoped organizerUsers record above, never this claim by itself.
    await getAuth(app).setCustomUserClaims(uid, { ...user.customClaims, campaign_admin: true, ...(role === "SUPER_ADMIN" ? { super_admin: true } : {}) });
    console.log(JSON.stringify({ applied: true, project, id, role }));
  } finally { await deleteApp(app); }
}
main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : "Provisioning failed"); process.exitCode = 1; });
