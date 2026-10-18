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

/** Consistent display casing for participant names without changing stored records. */
export function formatPersonName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word
        .split(/([-’'])/u)
        .map((part) =>
          /^[-’']$/u.test(part)
            ? part
            : part
              ? part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1).toLocaleLowerCase("es-CL")
              : part,
        )
        .join(""),
    )
    .join(" ");
}
