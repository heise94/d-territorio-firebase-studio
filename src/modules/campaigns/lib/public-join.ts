import type { CampaignStatus } from "../domain/types";

export type PublicJoinCampaign = {
  name: string;
  locationName?: string;
};

export type PublicJoinState =
  | { kind: "none" }
  | { kind: "multiple" }
  | { kind: "single"; campaign: PublicJoinCampaign };

/** Only a single open campaign is identified on the public landing page. */
export function selectPublicJoinCampaign(
  campaigns: Array<{
    status: CampaignStatus;
    name?: unknown;
    locationName?: unknown;
  }>,
): PublicJoinState {
  const open = campaigns.filter((campaign) => campaign.status === "registration_open");
  if (open.length === 0) return { kind: "none" };
  if (open.length !== 1) return { kind: "multiple" };
  const campaign = open[0];
  const name = typeof campaign.name === "string" ? campaign.name.trim() : "";
  if (!name) return { kind: "none" };
  const locationName =
    typeof campaign.locationName === "string"
      ? campaign.locationName.trim()
      : "";
  return {
    kind: "single",
    campaign: {
      name,
      ...(locationName ? { locationName } : {}),
    },
  };
}

export function joinShareUrl(origin: string, campaignId?: string): string {
  const url = new URL(origin);
  if (
    url.hostname === "campanas.d-territorio.cl" ||
    url.hostname ===
      "campanas-production--d-territorio-campanas-prod.us-central1.hosted.app"
  )
    return campaignId
      ? `https://campanas.d-territorio.cl/unirse?campana=${encodeURIComponent(campaignId)}`
      : "https://campanas.d-territorio.cl/unirse";
  const join = new URL("/unirse", url.origin);
  if (campaignId) join.searchParams.set("campana", campaignId);
  return join.href;
}
