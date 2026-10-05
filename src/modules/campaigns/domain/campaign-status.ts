import type { CampaignStatus } from "./types";

// Solo apertura y comienzo de planificación. Publicación y retrocesos quedan fuera.
export function canTransitionCampaignStatus(
  from: CampaignStatus,
  to: CampaignStatus,
) {
  return (
    from === to ||
    (from === "draft" && to === "registration_open") ||
    (from === "registration_open" && to === "planning")
  );
}
