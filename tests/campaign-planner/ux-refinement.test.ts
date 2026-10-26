import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PlannerAssignment, PlannerPerson, PlannerView } from "../../src/modules/campaigns/domain/planner";
import { operationalPlannerSummary, participantTurnLabel, pendingPairRequestIds } from "../../src/modules/campaigns/lib/planner-day-ux";

function person(id: string, input: Partial<PlannerPerson> = {}): PlannerPerson {
  return {
    registrationId: id,
    fullName: `Persona ${id}`,
    congregation: "Maquehue",
    assignedTurns: 0,
    assignedToday: 0,
    maxTurns: 3,
    available: true,
    profileActive: true,
    accepted: null,
    isMinor: false,
    guardianRegistrationId: null,
    guardianName: null,
    ...input,
  };
}

function assignment(id: string, personValue: PlannerPerson, pointId: string, slotNumber: 1 | 2 | 3 | 4): PlannerAssignment {
  return { id, registrationId: personValue.registrationId, pointId, slotNumber, version: 1, person: personValue, warnings: [], availabilityOverride: false, maxTurnsOverride: false };
}

function view(id: string, available: PlannerPerson[], slots: PlannerView["points"][number]["slots"]): PlannerView {
  return {
    campaign: { id: "campaign-a", name: "Campaña", status: "planning" },
    blocks: [],
    block: { id, dayId: "day-a", date: "2026-10-31", startTime: id === "block-1" ? "08:00" : "10:00", endTime: id === "block-1" ? "10:00" : "12:00", label: id, capacity: 16, active: true },
    mutable: true,
    canAssignSupport: true,
    points: [{ id: "point-a", name: "Punto 1", globalActive: true, active: true, slots }],
    available,
    exceptions: [],
    metrics: { available: available.length, assigned: slots.filter(Boolean).length, unassigned: 0, reserve: 0, reservePotential: null, activePoints: 1, openSlots: 4 - slots.filter(Boolean).length, incompletePoints: slots.filter(Boolean).length === 1 ? 1 : 0 },
    conflicts: [],
    updatedAt: "2026-10-24T12:00:00.000Z",
  };
}

test("operational summary counts unique points, assignments, people without turns and incomplete points", () => {
  const ana = person("ana");
  const beto = person("beto", { assignedToday: 1 });
  const first = view("block-1", [ana], [assignment("a1", beto, "point-a", 1), null, null, null]);
  const second = view("block-2", [ana], [null, null, null, null]);
  assert.deepEqual(operationalPlannerSummary([first, second]), {
    blocks: 2,
    points: 1,
    assignments: 1,
    withoutTurn: 1,
    pendingPairs: 0,
    pendingMinors: 0,
    incompletePoints: 1,
  });
  assert.equal(participantTurnLabel(ana, [first, second]), "Sin turno hoy");
  assert.equal(participantTurnLabel(beto, [first, second]), "Ya participa 08:00–10:00");
});

test("accepted links count only when both people share availability that day and disappear once placed together", () => {
  const ana = person("ana", { accepted: { requestId: "pair-1", otherRegistrationId: "beto", otherName: "Beto", availabilityConflict: false, blockAvailabilityConflict: false, participationConflict: false } });
  const beto = person("beto", { accepted: { requestId: "pair-1", otherRegistrationId: "ana", otherName: "Ana", availabilityConflict: false, blockAvailabilityConflict: false, participationConflict: false } });
  const unrelated = person("cata", { accepted: { requestId: "pair-2", otherRegistrationId: "dani", otherName: "Dani", availabilityConflict: false, blockAvailabilityConflict: false, participationConflict: false } });
  const open = view("block-1", [ana, beto, unrelated], [null, null, null, null]);
  assert.deepEqual(pendingPairRequestIds([open]), ["pair-1"]);
  const placed = view("block-1", [], [assignment("a1", ana, "point-a", 1), assignment("a2", beto, "point-a", 2), null, null]);
  assert.deepEqual(pendingPairRequestIds([placed]), []);
});

test("planner UI uses a compact program-style matrix and an on-demand right drawer", () => {
  const planner = readFileSync("src/modules/campaigns/components/campaign-planner.tsx", "utf8");
  const points = readFileSync("src/modules/campaigns/components/planner-points.tsx", "utf8");
  assert.match(planner, /fixed inset-y-0 right-0/);
  assert.match(planner, /Añadir participante/);
  assert.doesNotMatch(planner, /Selecciona un lugar|Lugar \{target\.slotNumber\}/);
  assert.match(planner, /Sin turno hoy/);
  assert.match(planner, /Ya participaron hoy/);
  assert.match(planner, /Asignar juntos/);
  assert.match(planner, /Menor · Responsable:/);
  assert.match(planner, /targetView\.available/);
  assert.doesNotMatch(planner + points, /<img|next\/image|Avatar/);
  assert.doesNotMatch(points, /type="checkbox"|Sin asignar|Aún sin hermano asignado/);
  assert.match(points, /MoreHorizontal/);
  assert.match(points, /firstEmpty <= 2 \|\| view\.canAssignSupport/);
  assert.match(points, /firstEmpty > 0/);
  assert.match(points, /min-w-\[920px\]/);
  assert.match(points, /data-point-state=/);
  assert.match(points, /PlannerScheduleMatrix/);
  assert.match(points, /Punto/);
  assert.match(points, /gridTemplateColumns/);
  assert.match(planner, /PlannerScheduleMatrix/);
});
