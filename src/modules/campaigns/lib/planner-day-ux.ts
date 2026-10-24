import type { PlannerPerson, PlannerView } from "../domain/planner";

const assignments = (views: PlannerView[]) => views.flatMap((view) => view.points.flatMap((point) => point.slots.filter(Boolean).map((assignment) => ({ assignment: assignment!, pointId: point.id, block: view.block! }))));

export function participantTurnLabel(person: PlannerPerson, views: PlannerView[]) {
  const turns = assignments(views).filter(({ assignment }) => assignment.registrationId === person.registrationId);
  if (!turns.length) return "Sin turno hoy";
  if (turns.length > 1) return `${turns.length} turnos hoy`;
  return `Ya participa ${turns[0].block.startTime}–${turns[0].block.endTime}`;
}

export function pendingPairRequestIds(views: PlannerView[]) {
  const placedTogether = new Set<string>();
  for (const view of views) for (const point of view.points) {
    const occupants = point.slots.filter(Boolean).map((slot) => slot!.person);
    const occupantIds = new Set(occupants.map((person) => person.registrationId));
    for (const person of occupants) if (person.accepted && occupantIds.has(person.accepted.otherRegistrationId)) placedTogether.add(person.accepted.requestId);
  }
  const applicable = new Set<string>();
  for (const view of views) {
    const availableIds = new Set(view.available.map((person) => person.registrationId));
    for (const person of view.available) if (person.accepted && availableIds.has(person.accepted.otherRegistrationId)) applicable.add(person.accepted.requestId);
  }
  return [...applicable].filter((requestId) => !placedTogether.has(requestId));
}

export function operationalPlannerSummary(views: PlannerView[]) {
  const assigned = assignments(views);
  const assignedIds = new Set(assigned.map(({ assignment }) => assignment.registrationId));
  const people = new Map<string, { person: PlannerPerson; available: boolean }>();
  for (const view of views) for (const person of [...view.available, ...view.exceptions, ...view.points.flatMap((point) => point.slots.filter(Boolean).map((item) => item!.person))]) {
    const current = people.get(person.registrationId);
    people.set(person.registrationId, { person, available: (current?.available ?? false) || person.available });
  }
  const pendingPairs = pendingPairRequestIds(views).length;
  let pendingMinors = 0;
  for (const { person, available } of people.values()) if (person.isMinor && (available || assignedIds.has(person.registrationId))) {
    const complete = views.some((view) => view.points.some((point) => {
      const occupants = point.slots.filter(Boolean).map((slot) => slot!.person);
      return occupants.some((item) => item.registrationId === person.registrationId) && !!person.guardianRegistrationId && occupants.some((item) => item.registrationId === person.guardianRegistrationId) && occupants.length >= 3;
    }));
    if (!complete) pendingMinors++;
  }
  return {
    blocks: views.length,
    points: new Set(views.flatMap((view) => view.points.filter((point) => point.globalActive).map((point) => point.id))).size,
    assignments: assigned.length,
    withoutTurn: [...people.values()].filter(({ available, person }) => available && !assignedIds.has(person.registrationId)).length,
    pendingPairs,
    pendingMinors,
    incompletePoints: views.reduce((sum, view) => sum + view.points.filter((point) => point.active && point.globalActive && point.slots.filter(Boolean).length === 1).length, 0),
  };
}
