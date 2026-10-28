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
import { campaignsAdminDb } from "./firebase-admin";
import { registrationIsEligible } from "../domain/registration";
import { calculateBlockCapacity } from "../domain/point-capacity";
import { requireCampaignAccess } from "./campaign-access";
import {
  activeAssignments,
  acceptedUnit,
  blockPointId,
  plannerLockCollection,
  readPlannerSource,
  type PlannerSource,
} from "./planner-source";
import { plannerPerson, projectPlanner, projectPlannerDay } from "./planner-view";
import type { OrganizerRole } from "../domain/organizer";

export type TrustedPlannerActor = { uid: string; role: OrganizerRole | "CAMPAIGN_HELPER" };

export async function getPlannerDay(token: string, campaignId: string, dayId?: string, trustedActor?: TrustedPlannerActor) {
  if (trustedActor) {
    if (!['SUPER_ADMIN', 'CAMPAIGN_ADMIN', 'CAMPAIGN_HELPER'].includes(trustedActor.role)) throw new AuthError(403, "Sin permiso para planificar.");
  } else await plannerAccess(token, campaignId);
  return campaignsAdminDb().runTransaction(async (tx) => {
    const source = await readPlannerSource(campaignsAdminDb(), tx, campaignId);
    // Campaign administrators have the same operational planning tools as the
    // primary administrator. Creating campaigns remains a platform-only task.
    return projectPlannerDay(source, dayId, true);
  }, { readOnly: true });
}

export class PlannerWarnings extends AuthError {
  constructor(public warnings: PlannerWarningDTO[]) {
    super(422, "Confirma explícitamente las excepciones antes de guardar.");
  }
}
const conflict = () => new AuthError(409, plannerConflictMessage);
async function plannerAccess(token: string, campaignId: string) {
  return requireCampaignAccess(campaignsAdminDb(), token, campaignId, [
    "SUPER_ADMIN",
    "CAMPAIGN_ADMIN",
  ]);
}
function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AuthError(400, "Datos de planificación inválidos.");
  return result.data;
}
function destination(source: PlannerSource, block: string, point: string) {
  if (
    !source.activeBlocks.has(block) ||
    !source.points.get(point)?.active ||
    !source.blockPoints.get(blockPointId(block, point))?.active
  )
    throw conflict();
}
function unitFor(source: PlannerSource, registration: string, block: string) {
  const unit = acceptedUnit(source, registration, block);
  if (
    !unit ||
    unit.some((id) => {
      const other = acceptedUnit(source, id, block);
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
      !registrationIsEligible(reg) ||
      source.profiles.get(reg.participantId)?.active !== true
    )
      throw conflict();
    const person = plannerPerson(source, id, block);
    const old = existing.find((item) => item.registrationId === id);
    const override = overrides.find((item) => item.registrationId === id);
    const unavailable = !person.available;
    if (unavailable && !old?.availabilityOverride && !override?.availability)
      warnings.push({
        registrationId: id,
        fullName: person.fullName,
        kind: "availability",
        message: "Esta persona no indicó disponibilidad para este horario.",
      });
    flags.set(id, {
      availabilityOverride:
        unavailable &&
        (!!old?.availabilityOverride || !!override?.availability),
      maxTurnsOverride: false,
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
  trustedActor?: TrustedPlannerActor,
) {
  if (trustedActor) {
    if (!['SUPER_ADMIN', 'CAMPAIGN_ADMIN', 'CAMPAIGN_HELPER'].includes(trustedActor.role)) throw new AuthError(403, "Sin permiso para planificar.");
  } else await plannerAccess(token, campaignId);
  return campaignsAdminDb().runTransaction(
    async (tx) =>
      projectPlanner(
        await readPlannerSource(campaignsAdminDb(), tx, campaignId),
        block,
        true,
      ),
    { readOnly: true },
  );
}
export async function setBlockPoint(
  token: string,
  campaignId: string,
  input: unknown,
) {
  const access = await plannerAccess(token, campaignId),
    uid = access.uid,
    value = parse(blockPointInputSchema, input),
    db = campaignsAdminDb();
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
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
  trustedActor?: TrustedPlannerActor,
) {
  const access = trustedActor ?? await plannerAccess(token, campaignId),
    uid = access.uid,
    value = parse(assignmentInputSchema, input),
    db = campaignsAdminDb();
  const newIds = [
    db.collection(names.assignments).doc().id,
    db.collection(names.assignments).doc().id,
    db.collection(names.assignments).doc().id,
    db.collection(names.assignments).doc().id,
  ];
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
    destination(source, value.timeBlockId, value.pointId);
    const unit = unitFor(source, value.registrationId, value.timeBlockId),
      active = activeAssignments(source).filter(
        (item) => item.timeBlockId === value.timeBlockId,
      );
    const baseRegistration = source.registrations.get(value.registrationId);
    if (!baseRegistration || baseRegistration.campaignId !== campaignId) throw conflict();
    let assignmentUnit = unit;
    if (baseRegistration.isMinor === true) {
      if (access.role !== "SUPER_ADMIN") throw new AuthError(403, "Solo el superadministrador puede planificar la participación de un menor.");
      if (unit.length !== 1 || !baseRegistration.guardianRegistrationId || !value.adultSupportRegistrationId)
        throw new AuthError(400, "Para asignar a un menor, agrega también a su responsable y a una hermana adulta.");
      const guardian = source.registrations.get(baseRegistration.guardianRegistrationId);
      const support = source.registrations.get(value.adultSupportRegistrationId);
      if (!guardian || guardian.campaignId !== campaignId || guardian.registrationStatus !== "active" || guardian.isMinor === true || !support || support.campaignId !== campaignId || support.registrationStatus !== "active" || support.isMinor === true || support.id === guardian.id || support.id === baseRegistration.id)
        throw new AuthError(400, "El menor debe ir con su responsable inscrito y una hermana adulta distinta.");
      if (unitFor(source, guardian.id, value.timeBlockId).length !== 1 || unitFor(source, support.id, value.timeBlockId).length !== 1)
        throw new AuthError(400, "No se puede separar un vínculo de compañero ya confirmado.");
      assignmentUnit = [value.registrationId, guardian.id, support.id];
    } else if (value.adultSupportRegistrationId) {
      throw new AuthError(400, "La persona de apoyo adicional solo aplica al asignar a un menor.");
    }
    if (value.slotNumber >= 3 && unit.length === 2)
      throw new AuthError(400, "Completa el vínculo confirmado antes de agregar apoyo adicional.");
    if (
      value.slotNumber === 4 &&
      !active.some(
        (assignment) =>
          assignment.pointId === value.pointId && assignment.slotNumber === 3,
      )
    )
      throw new AuthError(409, "Agrega primero el tercer integrante de apoyo.");
    const old = active.filter((item) => assignmentUnit.includes(item.registrationId));
    // An incomplete accepted unit can only be completed at its original point.
    if (
      old.length &&
      (assignmentUnit.length !== 2 ||
        old.length !== 1 ||
        old[0].pointId !== value.pointId ||
        old[0].registrationId === value.registrationId ||
        old[0].slotNumber === value.slotNumber)
    )
      throw conflict();
    const flags = validatePeople(
      source,
      assignmentUnit,
      value.timeBlockId,
      value.overrides,
      old,
    );
    const capacityOverride = value.slotNumber >= 3 || assignmentUnit.length === 3;
    const blockMinimum = calculateBlockCapacity(campaignId, value.timeBlockId, [...source.points.values()], [...source.blockPoints.values()]).minParticipants;
    const availablePeopleCount = [...source.registrations.values()].filter((registration) =>
      registration.registrationStatus === "active" && registrationIsEligible(registration) &&
      source.profiles.get(registration.participantId)?.active === true &&
      source.selections.get(registration.id)?.has(value.timeBlockId),
    ).length;
    const alreadyCovered = blockMinimum > 0 && availablePeopleCount >= blockMinimum;
    const capacityConfirmed = value.overrides.some((item) => item.registrationId === value.registrationId && item.capacity);
    if (capacityOverride && alreadyCovered && !capacityConfirmed)
      throw new PlannerWarnings([{
        registrationId: value.registrationId,
        fullName: plannerPerson(source, value.registrationId, value.timeBlockId).fullName,
        kind: "capacity",
        message: "Este horario ya cuenta con la cobertura necesaria. ¿Confirmas agregar un lugar adicional de apoyo?",
      }]);
    const targetSlots = assignmentUnit.length === 3 ? [1, 2, 3] : assignmentUnit.length === 2 ? (value.slotNumber === 1 ? [1, 2] : [2, 1]) : [value.slotNumber];
    assignmentUnit.forEach((registrationId, index) => {
      if (old.some((item) => item.registrationId === registrationId)) return;
      const slotNumber = targetSlots[index];
      if (
        active.some(
          (item) =>
            item.registrationId === registrationId ||
            (item.pointId === value.pointId && item.slotNumber === slotNumber),
        )
      )
        throw conflict();
    });
    assignmentUnit.forEach((registrationId, index) => {
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
      const slotNumber = targetSlots[index] as 1 | 2 | 3 | 4;
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
        ...(capacityOverride && alreadyCovered ? { capacityOverride: true } : {}),
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
        ...(assignmentUnit.length === 3 ? { minorSafeguardingGroup: "minor_guardian_adult_support" } : {}),
      });
      overrideAudits(tx, campaignId, uid, assignment);
      if (capacityOverride && alreadyCovered) audit(tx, campaignId, uid, "capacity_override", assignment.id, { registrationId, timeBlockId: value.timeBlockId, pointId: value.pointId });
    });
    revision(tx, source);
  });
}
export async function changeAssignment(
  token: string,
  campaignId: string,
  id: string,
  input: unknown,
  trustedActor?: TrustedPlannerActor,
) {
  const access = trustedActor ?? await plannerAccess(token, campaignId),
    uid = access.uid,
    value = parse(assignmentChangeSchema, input),
    db = campaignsAdminDb();
  await db.runTransaction(async (tx) => {
    const source = await readPlannerSource(db, tx, campaignId);
    const primary = activeAssignments(source).find((item) => item.id === id);
    if (!primary || (primary.version ?? 1) !== value.expectedVersion)
      throw conflict();
    let unit = unitFor(source, primary.registrationId, primary.timeBlockId);
    const currentBlockAssignments = activeAssignments(source).filter((item) => item.timeBlockId === primary.timeBlockId && item.pointId === primary.pointId);
    const minor = currentBlockAssignments.map((item) => source.registrations.get(item.registrationId)).find((registration) => registration?.isMinor === true && [registration.id, registration.guardianRegistrationId, currentBlockAssignments.find((candidate) => candidate.slotNumber === 3)?.registrationId].includes(primary.registrationId));
    const safeguardingGroup = !!minor;
    if (minor) {
      const support = currentBlockAssignments.find((item) => item.slotNumber === 3);
      if (!minor.guardianRegistrationId || !support || !currentBlockAssignments.some((item) => item.registrationId === minor.guardianRegistrationId)) throw conflict();
      unit = [minor.id, minor.guardianRegistrationId, support.registrationId];
    }
    const own = activeAssignments(source).filter(
        (item) =>
          item.timeBlockId === primary.timeBlockId &&
          unit.includes(item.registrationId),
      );
    if (safeguardingGroup && value.action === "move")
      throw new AuthError(409, "Para mover a un menor, libera el grupo completo y vuelve a asignarlo con su responsable y hermana adulta.");
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
      const blockMinimum = calculateBlockCapacity(campaignId, primary.timeBlockId, [...source.points.values()], [...source.blockPoints.values()]).minParticipants;
      const availablePeopleCount = [...source.registrations.values()].filter((registration) =>
        registration.registrationStatus === "active" && registrationIsEligible(registration) &&
        source.profiles.get(registration.participantId)?.active === true &&
        source.selections.get(registration.id)?.has(primary.timeBlockId),
      ).length;
      const capacityOverride = value.slotNumber >= 3 && blockMinimum > 0 && availablePeopleCount >= blockMinimum;
      const capacityConfirmed = value.overrides.some((item) => item.registrationId === primary.registrationId && item.capacity);
      if (capacityOverride && !capacityConfirmed)
        throw new PlannerWarnings([{
          registrationId: primary.registrationId,
          fullName: plannerPerson(source, primary.registrationId, primary.timeBlockId).fullName,
          kind: "capacity",
          message: "El horario ya cuenta con la cobertura necesaria. ¿Confirmas agregar este lugar adicional de apoyo?",
        }]);
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
        slotNumber: (safeguardingGroup ? item.slotNumber : item.id === primary.id
          ? value.slotNumber
          : value.slotNumber === 1 ? 2 : 1) as 1 | 2 | 3 | 4,
        ...flags.get(item.registrationId)!,
        ...(capacityOverride ? { capacityOverride: true } : {}),
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
          // Editing a previously published turn creates a new draft revision;
          // participant-facing program versions remain immutable until publish.
          status: "draft",
          availabilityOverride: target.availabilityOverride,
          maxTurnsOverride: target.maxTurnsOverride,
          ...(target.capacityOverride ? { capacityOverride: true } : {}),
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
        if (capacityOverride) audit(tx, campaignId, uid, "capacity_override", target.id, { registrationId: target.registrationId, timeBlockId: target.timeBlockId, pointId: target.pointId });
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
  const uid = (await plannerAccess(token, campaignId)).uid,
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
    const current = campaign.data()!;
    const from = current.status;
    if (value.status === "registration_open" && from === "published" && !current.currentProgramVersionId)
      throw conflict();
    if (value.status === "published" && (!current.currentProgramVersionId || from !== "registration_open"))
      throw conflict();
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
