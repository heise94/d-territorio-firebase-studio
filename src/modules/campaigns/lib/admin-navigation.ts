import type { OrganizerRole } from "../domain/organizer";

const campaignSections = [
  ["Resumen", "resumen"],
  ["Campaña", "campana"],
  ["Horarios y puntos", "campana", "horarios"],
  ["Participantes", "participantes"],
  ["Planificación", "planificar"],
  ["Programa", "programa"],
  ["Solicitudes", "cambios"],
  ["Información", "campana", "informacion"],
] as const;

/** Presentation only: every destination retains its existing authorization. */
export function campaignNavigation(
  role: OrganizerRole | null,
  campaignId: string,
) {
  if (role !== "SUPER_ADMIN" && role !== "CAMPAIGN_ADMIN") return [];
  return campaignSections.map(([label, path, section]) => ({
    label,
    href: `/campanas/admin/${path}/${encodeURIComponent(campaignId)}${section ? `?seccion=${section}` : ""}`,
    section: section ?? "general",
  }));
}
