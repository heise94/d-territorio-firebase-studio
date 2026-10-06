import "server-only";
import { createHash } from "node:crypto";
import type {
  ProgramIssue,
  ProgramSnapshot,
  ProgramView,
} from "../domain/program";
import type { PlannerSource } from "./planner-source";

/** Deterministic, minimal projection. No credentials, phones or raw availabilities. */
export function projectProgram(
  source: PlannerSource,
  options: { published?: boolean; allowEmpty?: boolean } = {},
): ProgramView {
  const { campaignId, campaign } = source;
  const assignments = source.assignments.filter(
    (a) => a.status !== "cancelled",
  );
  const blockingErrors: ProgramIssue[] = [],
    warnings: ProgramIssue[] = [];
  function issue(
    code: string,
    message: string,
    entityId = "",
    blockId = "",
    pointId = "",
    regId = "",
    warning = false,
  ) {
    const block = source.blocks.get(blockId);
    const reg = source.registrations.get(regId);
    (warning ? warnings : blockingErrors).push({
      code,
      message,
      entityId,
      date: block ? (source.days.get(block.campaignDayId)?.date ?? "") : "",
      hours: block ? `${block.startTime}–${block.endTime}` : "",
      point: source.points.get(pointId)?.name ?? "",
      person: reg
        ? (source.profiles.get(reg.participantId)?.fullName ?? "")
        : "",
    });
  }
  const validDestination = (blockId: string, pointId: string) =>
    source.activeBlocks.has(blockId) &&
    source.points.get(pointId)?.active === true &&
    [...source.blockPoints.values()].some(
      (p) =>
        p.campaignId === campaignId &&
        p.timeBlockId === blockId &&
        p.pointId === pointId &&
        p.active,
    );
  const people = new Set<string>(),
    slots = new Set<string>();
  for (const a of assignments) {
    const reg = source.registrations.get(a.registrationId);
    const invalid =
      a.status !== (options.published ? "published" : "draft") ||
      a.campaignId !== campaignId ||
      !validDestination(a.timeBlockId, a.pointId) ||
      reg?.campaignId !== campaignId ||
      reg.registrationStatus !== "active" ||
      source.profiles.get(reg.participantId)?.active !== true ||
      ![1, 2].includes(a.slotNumber);
    if (invalid)
      issue(
        "invalid_assignment",
        "Asignación inválida: revisa campaña, horario, punto e inscripción activos.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
      );
    const personKey = JSON.stringify([
      a.timeBlockId,
      reg?.participantId ?? a.registrationId,
    ]);
    const slotKey = JSON.stringify([a.timeBlockId, a.pointId, a.slotNumber]);
    if (people.has(personKey))
      issue(
        "duplicate_person",
        "La persona tiene más de una asignación en el bloque.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
      );
    if (slots.has(slotKey))
      issue(
        "duplicate_slot",
        "Dos asignaciones ocupan la misma posición.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
      );
    people.add(personKey);
    slots.add(slotKey);
    if (
      !source.selections.get(a.registrationId)?.has(a.timeBlockId) &&
      a.availabilityOverride !== true
    )
      issue(
        "unavailable",
        "Asignación sin disponibilidad ni excepción autorizada.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
      );
    if (a.availabilityOverride === true)
      issue(
        "availability_override",
        "Excepción de disponibilidad autorizada.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
        true,
      );
    if (a.maxTurnsOverride === true)
      issue(
        "max_turns_override",
        "Excepción de máximo de turnos autorizada.",
        a.id,
        a.timeBlockId,
        a.pointId,
        a.registrationId,
        true,
      );
  }
  // Fase 6 marks the extra turn, not previous turns. Each distinct authorized
  // extra block covers one excess turn; earlier valid assignments need no flag.
  for (const id of new Set(assignments.map((a) => a.registrationId))) {
    const rows = assignments.filter((a) => a.registrationId === id);
    const max = source.registrations.get(id)?.maxTurns;
    const count = new Set(rows.map((a) => a.timeBlockId)).size;
    const authorized = new Set(
      rows.filter((a) => a.maxTurnsOverride === true).map((a) => a.timeBlockId),
    ).size;
    if (max !== null && max !== undefined && count - max > authorized)
      issue(
        "max_turns",
        "Se supera el máximo de turnos sin suficientes excepciones autorizadas.",
        id,
        rows[0]?.timeBlockId,
        rows[0]?.pointId,
        id,
      );
  }
  const paired = new Set<string>();
  for (const pair of source.pairs
    .filter((p) => p.status === "accepted")
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const ids = [pair.requesterRegistrationId, pair.recipientRegistrationId];
    if (
      ids[0] === ids[1] ||
      ids.some((id) => paired.has(id) || !source.registrations.has(id))
    ) {
      issue(
        "corrupt_pair",
        "Pareja aceptada inválida o múltiple; corrige la planificación.",
        pair.id,
      );
    }
    ids.forEach((id) => paired.add(id));
    for (const block of new Set(
      assignments
        .filter((a) => ids.includes(a.registrationId))
        .map((a) => a.timeBlockId),
    )) {
      const members = ids.map((id) =>
        assignments.filter(
          (a) => a.registrationId === id && a.timeBlockId === block,
        ),
      );
      const [a, b] = members.map((rows) => rows[0]);
      if (
        members.some((rows) => rows.length !== 1) ||
        a?.pointId !== b?.pointId ||
        a?.slotNumber === b?.slotNumber
      )
        issue(
          "separated_pair",
          "Una pareja aceptada debe ocupar las dos posiciones del mismo punto y bloque.",
          pair.id,
          block,
          a?.pointId ?? b?.pointId,
          ids[0],
        );
    }
  }
  const days = [...source.days.values()]
    .filter((d) => d.active && d.campaignId === campaignId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.sortOrder - b.sortOrder ||
        a.id.localeCompare(b.id),
    );
  const snapshot: ProgramSnapshot = {
    campaign: {
      id: campaignId,
      name: campaign.name,
      locationName: campaign.locationName ?? "",
      locationDetails: campaign.locationDetails ?? "",
    },
    days: days.map((day) => {
      const blocks = [...source.activeBlocks.values()]
        .filter(
          (b) => b.campaignId === campaignId && b.campaignDayId === day.id,
        )
        .sort(
          (a, b) =>
            a.startTime.localeCompare(b.startTime) ||
            a.endTime.localeCompare(b.endTime) ||
            a.sortOrder - b.sortOrder ||
            a.id.localeCompare(b.id),
        );
      const points = [...source.points.values()]
        .filter(
          (p) =>
            p.campaignId === campaignId &&
            p.active &&
            blocks.some((b) => validDestination(b.id, p.id)),
        )
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name, "es") ||
            a.id.localeCompare(b.id),
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          locationText: p.locationText ?? "",
          description: p.description ?? "",
        }));
      return {
        id: day.id,
        date: day.date,
        label: day.label ?? "",
        points,
        blocks: blocks.map((block) => ({
          id: block.id,
          startTime: block.startTime,
          endTime: block.endTime,
          label: block.label ?? "",
          cells: points.map((point) => {
            const active = validDestination(block.id, point.id);
            const slots = ([1, 2] as const).map((slot) => {
              const a = active
                ? assignments.find(
                    (a) =>
                      a.timeBlockId === block.id &&
                      a.pointId === point.id &&
                      a.slotNumber === slot,
                  )
                : null;
              const reg = a ? source.registrations.get(a.registrationId) : null;
              const profile = reg
                ? source.profiles.get(reg.participantId)
                : null;
              return a
                ? {
                    assignmentId: a.id,
                    registrationId: a.registrationId,
                    fullName: profile?.fullName ?? "Persona no disponible",
                    congregation: profile?.congregationId
                      ? (source.congregations.get(profile.congregationId)
                          ?.name ?? "")
                      : "",
                  }
                : null;
            }) as [
              import("../domain/program").ProgramPerson | null,
              import("../domain/program").ProgramPerson | null,
            ];
            if (active) {
              const filled = slots.filter(Boolean).length;
              if (filled < 2)
                issue(
                  filled ? "incomplete_point" : "empty_point",
                  filled
                    ? "Este punto tiene solo un participante."
                    : "Este punto está activo pero no tiene participantes asignados.",
                  `${block.id}:${point.id}`,
                  block.id,
                  point.id,
                  "",
                  true,
                );
            }
            return { pointId: point.id, active, slots };
          }),
        })),
      };
    }),
  };
  if (!days.length) issue("no_days", "No hay días activos.");
  if (!snapshot.days.some((d) => d.blocks.length))
    issue("no_blocks", "No hay bloques activos.");
  if (!snapshot.days.some((d) => d.points.length))
    issue("no_points", "No hay puntos activos por bloque.");
  if (!assignments.length && !options.allowEmpty)
    issue("no_assignments", "No hay asignaciones para publicar.");
  const sortIssues = (items: ProgramIssue[]) =>
    items.sort(
      (a, b) =>
        a.code.localeCompare(b.code) || a.entityId.localeCompare(b.entityId),
    );
  sortIssues(blockingErrors);
  sortIssues(warnings);
  // Captures configuration/profile edits as well as Phase 6's common write lock.
  const plannerRevision = createHash("sha256")
    .update(
      JSON.stringify({
        revision: source.revision,
        snapshot,
        blockingErrors,
        warnings,
        assignments: assignments
          .map((a) => ({ id: a.id, version: a.version }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex");
  return {
    mode: "draft",
    campaignStatus: campaign.status,
    version: null,
    publishedAt: null,
    plannerRevision,
    snapshot,
    blockingErrors,
    warnings,
    assignmentCount: assignments.length,
  };
}
