import "server-only";
import { campaignCollections } from "../lib/paths";
import { selectPublicJoinCampaign } from "../lib/public-join";
import { campaignsAdminDb } from "./firebase-admin";

export async function getPublicJoinState() {
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
