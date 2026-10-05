import "server-only";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignCollections as names } from "../lib/paths";
import {
  plannerConflictMessage,
  type Assignment,
  type PlannerWarningDTO,
} from "../domain/planner";
import { canTransitionCampaignStatus } from "../domain/campaign-status";
import {
  assignmentInputSchema,
  assignmentChangeSchema,
  blockPointInputSchema,
  plannerStatusSchema,
  type PlannerOverrides,
} from "../schemas/planner-schemas";
import { AuthError } from "./auth/service";
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import { campaignsAdminDb } from "./firebase-admin";
import {
  activeAssignments,
  acceptedUnit,
  blockPointId,
  plannerLockCollection,
  readPlannerSource,
  type PlannerSource,
} from "./planner-source";
import { plannerPerson, projectPlanner } from "./planner-view";

export class PlannerWarnings extends AuthError {
  constructor(public warnings: PlannerWarningDTO[]) {
    super(422, "Confirma explícitamente las excepciones antes de guardar.");
  }
}
const conflict = () => new AuthError(409, plannerConflictMessage);
function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AuthError(400, "Datos de planificación inválidos.");
  return result.data;
}
function planning(source: PlannerSource) {
  if (source.campaign.status !== "planning")
    throw new AuthError(409, "La campaña debe estar en planificación.");
}
function destination(source: PlannerSource, block: string, point: string) {
  if (
    !source.activeBlocks.has(block) ||
    !source.points.get(point)?.active ||
    !source.blockPoints.get(blockPointId(block, point))?.active
  )
    throw conflict();
}
function unitFor(source: PlannerSource, registration: string) {
  const unit = acceptedUnit(source, registration);
  if (
    !unit ||
    unit.some((id) => {
      const other = acceptedUnit(source, id);
      return (
        !other ||
        other.length !== unit.length ||
        other.some((member) => !unit.includes(member))
      );
    })
  )
    throw conflict();
  return unit;
}
function audit(
  tx: Transaction,
  campaignId: string,
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  tx.create(campaignsAdminDb().collection(names.auditLogs).doc(), {
    campaignId,
    actorId,
    action,
    entityId,
    metadata,
    createdAt: Timestamp.now(),
  });
}
function revision(tx: Transaction, source: PlannerSource) {
  tx.set(source.lockRef, {
    revision: source.revision + 1,
    updatedAt: Timestamp.now(),
  });
}
function validatePeople(
  source: PlannerSource,
  unit: string[],
  block: string,
  overrides: PlannerOverrides,
  existing: Assignment[] = [],
) {
  if (overrides.some((item) => !unit.includes(item.registrationId)))
    throw new AuthError(400, "Excepción ajena a la asignación.");
  const warnings: PlannerWarningDTO[] = [];
  const flags = new Map<
    string,
    { availabilityOverride: boolean; maxTurnsOverride: boolean }
  >();
  for (const id of unit) {
    const reg = source.registrations.get(id);
    if (
      reg?.registrationStatus !== "active" ||
      source.profiles.get(reg.participantId)?.active !== true
    )
      throw conflict();
    const person = plannerPerson(source, id, block);
    const old = existing.find((item) => item.registrationId === id);
    const override = overrides.find((item) => item.registrationId === id);
    const unavailable = !person.available;
    const projectedTurns =
      person.assignedTurns +
      (activeAssignments(source).some(
        (item) => item.registrationId === id && item.timeBlockId === block,
      )
        ? 0
        : 1);
    const exceeds =
      person.maxTurns !== null && projectedTurns > person.maxTurns;
    if (unavailable && !old?.availabilityOverride && !override?.availability)
      warnings.push({
        registrationId: id,
        fullName: person.fullName,
        kind: "availability",
        message: "Esta persona no indicó disponibilidad para este horario.",
      });
    if (exceeds && !old?.maxTurnsOverride && !override?.maxTurns)
      warnings.push({
        registrationId: id,
        fullName: person.fullName,
        kind: "maxTurns",
        message: `Esta asignación supera el máximo de turnos indicado por el participante: ${person.maxTurns} (${projectedTurns} asignados).`,
      });
    flags.set(id, {
      availabilityOverride:
        unavailable &&
        (!!old?.availabilityOverride || !!override?.availability),
      maxTurnsOverride:
        exceeds && (!!old?.maxTurnsOverride || !!override?.maxTurns),
    });
  }
  if (warnings.length) throw new PlannerWarnings(warnings);
  return flags;
}
function overrideAudits(
  tx: Transaction,
  campaignId: string,
  uid: string,
  assignment: Assignment,
  previous?: Assignment,
) {
  for (const [flag, action] of [
    ["availabilityOverride", "availability_override"],
    ["maxTurnsOverride", "max_turns_override"],
  ] as const) {
    if (assignment[flag] && !previous?.[flag])
      audit(tx, campaignId, uid, action, assignment.id, {
        registrationId: assignment.registrationId,
        timeBlockId: assignment.timeBlockId,
      });
  }
}
export async function getPlanner(
  token: string,
  campaignId: string,
  block?: string,
) {
  await authorizeCampaignDashboard(token);
  return campaignsAdminDb().runTransaction(
    async (tx) =>
      projectPlanner(
        await readPlannerSource(campaignsAdminDb(), tx, campaignId),
        block,
      ),
    { readOnly: true },
  );
}
export async function setBlockPoint(
  token: string,
  campaignId: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token),
    value = parse(blockPointInputSchema, input),
    db = campaignsAdminDb();
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
    planning(source);
    const id = blockPointId(value.timeBlockId, value.pointId),
      old = source.blockPoints.get(id);
    if (
      !source.blocks.has(value.timeBlockId) ||
      !source.points.has(value.pointId)
    )
      throw conflict();
    if (
      value.active &&
      (!source.activeBlocks.has(value.timeBlockId) ||
        !source.points.get(value.pointId)?.active)
    )
      throw conflict();
    if (
      !value.active &&
      activeAssignments(source).some(
        (item) =>
          item.timeBlockId === value.timeBlockId &&
          item.pointId === value.pointId,
      )
    )
      throw conflict();
    if (old?.active === value.active) return;
    const limit =
      source.days.get(source.blocks.get(value.timeBlockId)!.campaignDayId)
        ?.maxPointsOverride ?? source.campaign.maxPointsDefault;
    if (
      value.active &&
      limit !== undefined &&
      limit !== null &&
      [...source.blockPoints.values()].filter(
        (item) => item.timeBlockId === value.timeBlockId && item.active,
      ).length >= limit
    )
      throw new AuthError(
        409,
        "Se alcanzó el máximo de puntos configurado para el día.",
      );
    tx.set(db.collection(names.blockPoints).doc(id), {
      ...value,
      campaignId,
      createdAt: old?.createdAt ?? Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    audit(
      tx,
      campaignId,
      uid,
      value.active ? "block_point_activated" : "block_point_deactivated",
      id,
      { timeBlockId: value.timeBlockId, pointId: value.pointId },
    );
    revision(tx, source);
  });
}
export async function createAssignment(
  token: string,
  campaignId: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token),
    value = parse(assignmentInputSchema, input),
    db = campaignsAdminDb();
  const newIds = [
    db.collection(names.assignments).doc().id,
    db.collection(names.assignments).doc().id,
  ];
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
    planning(source);
    destination(source, value.timeBlockId, value.pointId);
    const unit = unitFor(source, value.registrationId),
      active = activeAssignments(source).filter(
        (item) => item.timeBlockId === value.timeBlockId,
      );
    const old = active.filter((item) => unit.includes(item.registrationId));
    // An incomplete accepted unit can only be completed at its original point.
    if (
      old.length &&
      (unit.length !== 2 ||
        old.length !== 1 ||
        old[0].pointId !== value.pointId ||
        old[0].registrationId === value.registrationId ||
        old[0].slotNumber === value.slotNumber)
    )
      throw conflict();
    const flags = validatePeople(
      source,
      unit,
      value.timeBlockId,
      value.overrides,
      old,
    );
    unit.forEach((registrationId, index) => {
      if (old.some((item) => item.registrationId === registrationId)) return;
      const slotNumber = (
        index === 0 ? value.slotNumber : value.slotNumber === 1 ? 2 : 1
      ) as 1 | 2;
      if (
        active.some(
          (item) =>
            item.registrationId === registrationId ||
            (item.pointId === value.pointId && item.slotNumber === slotNumber),
        )
      )
        throw conflict();
    });
    unit.forEach((registrationId, index) => {
      const previous = old.find(
        (item) => item.registrationId === registrationId,
      );
      if (previous) {
        const updated = { ...previous, ...flags.get(registrationId)! };
        if (
          updated.availabilityOverride !== previous.availabilityOverride ||
          updated.maxTurnsOverride !== previous.maxTurnsOverride
        ) {
          tx.update(db.collection(names.assignments).doc(previous.id), {
            ...flags.get(registrationId)!,
            version: (previous.version ?? 1) + 1,
            updatedAt: Timestamp.now(),
          });
          overrideAudits(tx, campaignId, uid, updated, previous);
        }
        return;
      }
      const slotNumber = (
        index === 0 ? value.slotNumber : value.slotNumber === 1 ? 2 : 1
      ) as 1 | 2;
      const assignment: Assignment = {
        id: newIds[index],
        campaignId,
        timeBlockId: value.timeBlockId,
        pointId: value.pointId,
        registrationId,
        slotNumber,
        status: "draft",
        createdBy: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        ...flags.get(registrationId)!,
      };
      tx.create(
        db.collection(names.assignments).doc(assignment.id),
        assignment,
      );
      audit(tx, campaignId, uid, "assignment_created", assignment.id, {
        registrationId,
        timeBlockId: value.timeBlockId,
        pointId: value.pointId,
        slotNumber,
      });
      overrideAudits(tx, campaignId, uid, assignment);
    });
    revision(tx, source);
  });
}
export async function changeAssignment(
  token: string,
  campaignId: string,
  id: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token),
    value = parse(assignmentChangeSchema, input),
    db = campaignsAdminDb();
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
    planning(source);
    const primary = activeAssignments(source).find((item) => item.id === id);
    if (!primary || (primary.version ?? 1) !== value.expectedVersion)
      throw conflict();
    const unit = unitFor(source, primary.registrationId),
      own = activeAssignments(source).filter(
        (item) =>
          item.timeBlockId === primary.timeBlockId &&
          unit.includes(item.registrationId),
      );
    if (value.action === "cancel") {
      for (const item of own) {
        tx.update(db.collection(names.assignments).doc(item.id), {
          status: "cancelled",
          version: (item.version ?? 1) + 1,
          updatedAt: Timestamp.now(),
        });
        audit(tx, campaignId, uid, "assignment_cancelled", item.id, {
          registrationId: item.registrationId,
          timeBlockId: item.timeBlockId,
        });
      }
    } else {
      destination(source, primary.timeBlockId, value.pointId);
      if (
        own.length !== unit.length ||
        (unit.length === 2 &&
          (own[0].pointId !== own[1].pointId ||
            own[0].slotNumber === own[1].slotNumber))
      )
        throw conflict();
      const flags = validatePeople(
        source,
        unit,
        primary.timeBlockId,
        value.overrides,
        own,
      );
      const targets = own.map((item) => ({
        ...item,
        pointId: value.pointId,
        slotNumber: (item.id === primary.id
          ? value.slotNumber
          : value.slotNumber === 1
            ? 2
            : 1) as 1 | 2,
        ...flags.get(item.registrationId)!,
        version: (item.version ?? 1) + 1,
        updatedAt: Timestamp.now(),
      }));
      if (
        targets.some((target) =>
          activeAssignments(source).some(
            (item) =>
              !own.some((member) => member.id === item.id) &&
              item.timeBlockId === primary.timeBlockId &&
              item.pointId === target.pointId &&
              item.slotNumber === target.slotNumber,
          ),
        )
      )
        throw conflict();
      for (const target of targets) {
        tx.update(db.collection(names.assignments).doc(target.id), {
          pointId: target.pointId,
          slotNumber: target.slotNumber,
          availabilityOverride: target.availabilityOverride,
          maxTurnsOverride: target.maxTurnsOverride,
          version: target.version,
          updatedAt: target.updatedAt,
        });
        audit(tx, campaignId, uid, "assignment_moved", target.id, {
          timeBlockId: target.timeBlockId,
          fromPointId: primary.pointId,
          pointId: target.pointId,
          slotNumber: target.slotNumber,
        });
        overrideAudits(
          tx,
          campaignId,
          uid,
          target,
          own.find((item) => item.id === target.id),
        );
      }
    }
    revision(tx, source);
  });
}
export async function changePlannerStatus(
  token: string,
  campaignId: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token),
    value = parse(plannerStatusSchema, input),
    db = campaignsAdminDb();
  await db.runTransaction(async (tx) => {
    const ref = db.collection(names.campaigns).doc(campaignId),
      lock = db.collection(plannerLockCollection).doc(campaignId);
    const [campaign, revisionDoc] = await Promise.all([
      tx.get(ref),
      tx.get(lock),
    ]);
    if (!campaign.exists) throw new AuthError(404, "Campaña no disponible.");
    const from = campaign.data()!.status;
    if (
      from === value.status ||
      !canTransitionCampaignStatus(from, value.status)
    )
      throw conflict();
    tx.update(ref, { status: value.status, updatedAt: Timestamp.now() });
    tx.set(lock, {
      revision: Number(revisionDoc.data()?.revision ?? 0) + 1,
      updatedAt: Timestamp.now(),
    });
    audit(tx, campaignId, uid, "campaign_status_changed", campaignId, {
      from,
      status: value.status,
    });
  });
  return { status: value.status };
}
