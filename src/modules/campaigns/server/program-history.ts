import "server-only";
import { campaignsAdminDb } from "./firebase-admin";
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import { campaignCollections as names } from "../lib/paths";
import { AuthError } from "./auth/service";
export async function programHistory(token: string, campaignId: string) {
  await authorizeCampaignDashboard(token);
  const db = campaignsAdminDb();
  return db.runTransaction(
    async (tx) => {
      const campaign = (
        await tx.get(db.collection(names.campaigns).doc(campaignId))
      ).data();
      if (!campaign) throw new AuthError(404, "Campaña no disponible.");
      const versions = await tx.get(
        db
          .collection(names.programVersions)
          .where("campaignId", "==", campaignId),
      );
      return {
        currentVersion: campaign.programVersion ?? null,
        versions: versions.docs
          .map((d) => ({
            version: Number(d.data().version),
            publishedAt: d.data().publishedAt.toDate().toISOString(),
            current: d.id === campaign.currentProgramVersionId,
          }))
          .sort((a, b) => a.version - b.version),
      };
    },
    { readOnly: true },
  );
}
