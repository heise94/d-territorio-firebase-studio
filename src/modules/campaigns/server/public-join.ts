import "server-only";
import { campaignCollections } from "../lib/paths";
import { selectPublicJoinCampaign } from "../lib/public-join";
import { campaignsAdminDb } from "./firebase-admin";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";

export async function getPublicJoinState(campaignId?: string) {
  if (campaignId) {
    if (!campaignDocumentIdSchema.safeParse(campaignId).success)
      return selectPublicJoinCampaign([]);
    const campaign = await campaignsAdminDb()
      .collection(campaignCollections.campaigns)
      .doc(campaignId)
      .get();
    return selectPublicJoinCampaign(
      campaign.exists
        ? [{
            status: campaign.data()?.status,
            name: campaign.data()?.name,
            locationName: campaign.data()?.locationName,
          }]
        : [],
    );
  }
  const snapshot = await campaignsAdminDb()
    .collection(campaignCollections.campaigns)
    .where("status", "==", "registration_open")
    .limit(2)
    .get();
  return selectPublicJoinCampaign(
    snapshot.docs.map((document) => ({
      status: document.data().status,
      name: document.data().name,
      locationName: document.data().locationName,
    })),
  );
}
