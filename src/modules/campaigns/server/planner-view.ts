import "server-only";
import type {
  PlannerAssignment,
  PlannerPerson,
  PlannerView,
} from "../domain/planner";
import { calculateCoverage } from "../domain/registration";
import { AuthError } from "./auth/service";
import {
  activeAssignments,
  acceptedUnit,
  type PlannerSource,
} from "./planner-source";

export function plannerPerson(
  source: PlannerSource,
  id: string,
  blockId: string,
): PlannerPerson {
  const registration = source.registrations.get(id);
  const profile = registration
    ? source.profiles.get(registration.participantId)
    : undefined;
  const unit = acceptedUnit(source, id);
  const otherId = unit?.[1];
  const other = otherId ? source.registrations.get(otherId) : undefined;
  const first = source.selections.get(id) ?? new Set<string>(),
    second = otherId
      ? (source.selections.get(otherId) ?? new Set<string>())
      : new Set<string>();
  const pair = otherId
    ? source.pairs.find(
        (pair) =>
          pair.status === "accepted" &&
          [pair.requesterRegistrationId, pair.recipientRegistrationId].includes(
            id,
          ),
      )
    : null;
  return {
    registrationId: id,
    fullName: profile?.fullName ?? "Participante no disponible",
    congregation: profile?.congregationId
      ? (source.congregations.get(profile.congregationId)?.name ??
        "Congregación no disponible")
      : "Sin congregación",
    profileActive: profile?.active === true,
    available: first.has(blockId),
    assignedTurns: new Set(
      activeAssignments(source)
        .filter((assignment) => assignment.registrationId === id)
        .map((assignment) => assignment.timeBlockId),
    ).size,
    maxTurns: registration?.maxTurns ?? null,
    accepted:
      otherId && pair
        ? {
            requestId: pair.id,
            otherRegistrationId: otherId,
            otherName: other
              ? (source.profiles.get(other.participantId)?.fullName ??
                "Participante no disponible")
              : "Participante no disponible",
            availabilityConflict: ![...first].some(
              (block) => second.has(block) && source.activeBlocks.has(block),
            ),
            blockAvailabilityConflict:
              !first.has(blockId) || !second.has(blockId),
            participationConflict:
              registration?.registrationStatus !== "active" ||
              !profile?.active ||
              other?.registrationStatus !== "active" ||
              !other ||
              source.profiles.get(other.participantId)?.active !== true,
          }
        : null,
  };
}
export function projectPlanner(
  source: PlannerSource,
  requestedBlockId?: string,
): PlannerView {
  const blocks = [...source.activeBlocks.values()]
    .map((block) => ({
      id: block.id,
      dayId: block.campaignDayId,
      date: source.days.get(block.campaignDayId)!.date,
      startTime: block.startTime,
      endTime: block.endTime,
      label: block.label ?? "",
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.id.localeCompare(b.id),
    );
  const selected = requestedBlockId ?? blocks[0]?.id;
  const block = selected ? source.blocks.get(selected) : null;
  if (requestedBlockId && !block)
    throw new AuthError(404, "Bloque no disponible en esta campaña.");
  const assigned = activeAssignments(source).filter(
    (assignment) => assignment.timeBlockId === selected,
  );
  const assignedIds = new Set(
    assigned.map((assignment) => assignment.registrationId),
  );
  const people = selected
    ? [...source.registrations.values()]
        .filter((registration) => registration.registrationStatus === "active")
        .map((registration) => plannerPerson(source, registration.id, selected))
        .sort(
          (a, b) =>
            a.fullName.localeCompare(b.fullName, "es") ||
            a.registrationId.localeCompare(b.registrationId),
        )
    : [];
  const available = people.filter(
    (person) => person.available && !assignedIds.has(person.registrationId),
  );
  const exceptions = people.filter(
    (person) => !person.available && !assignedIds.has(person.registrationId),
  );
  const conflicts = new Set<string>();
  const pointIds = new Set([
    ...source.points.keys(),
    ...assigned.map((assignment) => assignment.pointId),
    ...[...source.blockPoints.values()]
      .filter((point) => point.timeBlockId === selected)
      .map((point) => point.pointId),
  ]);
  const points = [...pointIds]
    .map((id) => {
      const point = source.points.get(id);
      const enabled = [...source.blockPoints.values()].some(
        (item) =>
          item.timeBlockId === selected && item.pointId === id && item.active,
      );
      const own = assigned.filter((assignment) => assignment.pointId === id);
      const slots: [PlannerAssignment | null, PlannerAssignment | null] = [
        null,
        null,
      ];
      for (const assignment of own) {
        const person = plannerPerson(
          source,
          assignment.registrationId,
          selected!,
        );
        const warnings: string[] = [];
        if (!point?.active || !enabled || !source.activeBlocks.has(selected!))
          warnings.push(
            "Punto o bloque inactivo/eliminado. Libera o revisa esta asignación.",
          );
        if (
          !person.profileActive ||
          source.registrations.get(assignment.registrationId)
            ?.registrationStatus !== "active"
        )
          warnings.push("Inscripción o perfil inactivo.");
        if (!person.available && !assignment.availabilityOverride)
          warnings.push(
            "Disponibilidad no declarada, sin excepción registrada.",
          );
        if (person.maxTurns !== null && person.assignedTurns > person.maxTurns)
          warnings.push("Supera el máximo de turnos.");
        if (
          assigned.filter(
            (item) => item.registrationId === assignment.registrationId,
          ).length > 1
        )
          warnings.push("Conflicto: persona duplicada en el bloque.");
        const unit = acceptedUnit(source, assignment.registrationId);
        if (!unit) warnings.push("Vínculos accepted incompatibles.");
        if (unit?.length === 2) {
          const companion = assigned.filter(
            (item) => item.registrationId === unit[1],
          );
          if (
            companion.length !== 1 ||
            companion[0].pointId !== id ||
            companion[0].slotNumber === assignment.slotNumber
          )
            warnings.push(
              "Vínculo obligatorio incompleto o separado: completa en este punto o libera el vínculo.",
            );
        }
        const dto: PlannerAssignment = {
          id: assignment.id,
          registrationId: assignment.registrationId,
          pointId: id,
          slotNumber: assignment.slotNumber,
          version: assignment.version ?? 1,
          person,
          warnings,
          availabilityOverride: assignment.availabilityOverride === true,
          maxTurnsOverride: assignment.maxTurnsOverride === true,
        };
        if (assignment.slotNumber !== 1 && assignment.slotNumber !== 2)
          warnings.push("Slot inválido.");
        else if (slots[assignment.slotNumber - 1])
          warnings.push("Conflicto: slot ocupado más de una vez.");
        else slots[assignment.slotNumber - 1] = dto;
        for (const warning of warnings)
          conflicts.add(person.fullName + ": " + warning);
      }
      return {
        id,
        name: point?.name ?? "Punto eliminado/no disponible",
        globalActive: point?.active === true,
        active: enabled,
        slots,
      };
    })
    .sort(
      (a, b) => a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id),
    );
  for (const person of [...available, ...exceptions]) {
    if (person.accepted?.availabilityConflict)
      conflicts.add(
        person.fullName + ": vínculo accepted sin horarios activos en común.",
      );
    if (person.accepted?.participationConflict)
      conflicts.add(person.fullName + ": revisar participación del vínculo.");
    if (!acceptedUnit(source, person.registrationId))
      conflicts.add(person.fullName + ": vínculos accepted incompatibles.");
  }
  const activePoints = points.filter(
    (point) => point.active && point.globalActive,
  );
  const availableCount = people.filter((person) => person.available).length;
  return {
    campaign: {
      id: source.campaignId,
      name: source.campaign.name,
      status: source.campaign.status,
    },
    blocks,
    block:
      block && selected
        ? {
            id: selected,
            dayId: block.campaignDayId,
            date: source.days.get(block.campaignDayId)?.date ?? "",
            startTime: block.startTime,
            endTime: block.endTime,
            label: block.label ?? "",
            capacity:
              block.capacityOverride ??
              source.campaign.defaultCapacityPerBlock ??
              null,
            active: source.activeBlocks.has(selected),
          }
        : null,
    mutable:
      source.campaign.status === "planning" &&
      !!selected &&
      source.activeBlocks.has(selected),
    points: block ? points : [],
    available,
    exceptions,
    metrics: {
      available: availableCount,
      assigned: assignedIds.size,
      unassigned: available.length,
      reserve: available.length,
      reservePotential: calculateCoverage(
        availableCount,
        block?.capacityOverride,
        source.campaign.defaultCapacityPerBlock,
      ).reservePotential,
      activePoints: activePoints.length,
      openSlots: activePoints.length * 2,
      incompletePoints: activePoints.filter(
        (point) => point.slots.filter(Boolean).length === 1,
      ).length,
    },
    conflicts: [...conflicts],
    updatedAt: new Date().toISOString(),
  };
}
