import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { requireDeploymentEnvironment } from "../lib/deployment";

export function campaignsAdminApp() {
  if (process.env.NODE_ENV === "production" || process.env.CAMPAIGNS_ENV)
    requireDeploymentEnvironment(process.env);
  const existing = getApps().find((app) => app.name === "campaigns-server");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (
    (clientEmail || privateKey) &&
    !(projectId && clientEmail && privateKey)
  ) {
    throw new Error("Incomplete server credentials");
  }
  return initializeApp(
    {
      ...(projectId ? { projectId } : {}),
      credential:
        clientEmail && privateKey && projectId
          ? cert({ projectId, clientEmail, privateKey })
          : applicationDefault(),
    },
    "campaigns-server",
  );
}

export const campaignsAdminDb = () => getFirestore(campaignsAdminApp());

/** Does not provision claims or depend on the client-side users collection. */
export async function requireCampaignOrganizer(idToken: string) {
  const decoded = await getAuth(campaignsAdminApp()).verifyIdToken(
    idToken,
    true,
  );
  if (decoded.campaign_admin !== true)
    throw new Error("Organizer authorization required");
  return decoded.uid;
}
