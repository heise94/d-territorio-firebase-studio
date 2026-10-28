import type { PlannerView } from "../domain/planner";

/** A day response contains one complete planner view per block. */
export function organizationPlannerBlock(views: PlannerView[], blockId: string) {
  return views.find((view) => view.block?.id === blockId) ?? null;
}

export function organizationPlannerBlockLabel(view: PlannerView) {
  return view.block ? `${view.block.startTime} – ${view.block.endTime}` : "Horario no disponible";
}
