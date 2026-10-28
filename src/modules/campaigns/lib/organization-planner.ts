import type { PlannerView } from "../domain/planner";
import { matchesParticipantSearch } from "./participant-search";

/** A day response contains one complete planner view per block. */
export function organizationPlannerBlock(views: PlannerView[], blockId: string) {
  return views.find((view) => view.block?.id === blockId) ?? null;
}

export function organizationPlannerBlockLabel(view: PlannerView) {
  return view.block ? `${view.block.startTime} – ${view.block.endTime}` : "Horario no disponible";
}

export function organizationPlannerCandidates(view: PlannerView | null, search: string) {
  if (!view || search.trim().length < 2) return [];
  return [...view.available, ...view.exceptions].filter((person) =>
    matchesParticipantSearch(person.fullName, undefined, search),
  );
}
