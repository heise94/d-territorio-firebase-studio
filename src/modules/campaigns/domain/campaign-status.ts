import type { CampaignStatus } from "./types";

// La publicación solo se realiza mediante la transacción dedicada. Antes de
// publicar, el equipo puede abrir y cerrar las inscripciones cuantas veces
// necesite sin afectar la planificación ya preparada.
export function canTransitionCampaignStatus(
  from: CampaignStatus,
  to: CampaignStatus,
  context: "configuration" | "publication" = "configuration",
) {
  return (
    from === to ||
    (from === "draft" && to === "registration_open") ||
    (from === "registration_open" && to === "planning") ||
    (from === "planning" && to === "registration_open") ||
    (from === "published" && to === "registration_open") ||
    (from === "registration_open" && to === "published") ||
    (context === "publication" && from === "planning" && to === "published")
  );
}
