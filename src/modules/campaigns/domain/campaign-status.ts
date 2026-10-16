import type { CampaignStatus } from "./types";

// Publicación solo mediante la transacción dedicada; no hay retrocesos.
export function canTransitionCampaignStatus(
  from: CampaignStatus,
  to: CampaignStatus,
  context: "configuration" | "publication" = "configuration",
) {
  return (
    from === to ||
    (from === "draft" && to === "registration_open") ||
    (from === "registration_open" && to === "planning") ||
    (context === "publication" && from === "planning" && to === "published")
  );
}
