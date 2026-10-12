import type { CampaignStatus } from "../domain/types";
import type { PairRequestStatus } from "../domain/pair-request";

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  draft: "Borrador",
  registration_open: "Inscripciones abiertas",
  planning: "En planificación",
  published: "Programa publicado",
  active: "En curso",
  completed: "Finalizada",
};
export const pairStatusLabels: Record<PairRequestStatus, string> = {
  pending: "Pendiente de confirmación",
  accepted: "Confirmado · vínculo obligatorio",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};
export function registrationStatusLabel(status: string) {
  return (
    (
      {
        active: "Activa",
        withdrawn: "Retirada",
        cancelled: "Cancelada",
      } as Record<string, string>
    )[status] ?? "Estado no disponible"
  );
}
