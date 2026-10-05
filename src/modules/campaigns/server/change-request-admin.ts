import "server-only";
import { createHash } from "node:crypto";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import type { Assignment } from "../domain/planner";
import type { ProgramVersion, ProgramView } from "../domain/program";
import { campaignCollections as names } from "../lib/paths";
import { resolveChangeSchema } from "../schemas/change-request-schemas";
import { AuthError } from "./auth/service";
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import { campaignsAdminDb } from "./firebase-admin";
import { acceptedUnit } from "./planner-source";
import { projectProgram } from "./program-projection";
import {
  programVersionId,
  ProgramValidationError,
  publishedView,
} from "./program-service";
import {
  changeConflict,
  officialContext,
  readChange,
  reserves,
  resultingSnapshot,
} from "./change-request-context";
import {
  affectedRegistrations,
  writeNotification,
} from "./change-notifications";

import { changeAudit as audit } from "./change-request-review";
export { adminChanges, decideChange } from "./change-request-review";

type Resolution = ReturnType<typeof resolveChangeSchema.parse>;
async function resolution(
  tx: Transaction,
  campaignId: string,
  id: string,
  data: Resolution,
  uid: string,
) {
  const context = await officialContext(tx, campaignId);
  const { request, ref } = await readChange(tx, campaignId, id);
  const { source, version } = context;
  if (
    request.status !== "approved" ||
    data.expectedProgramVersion !== version.version ||
    data.currentProgramVersionId !== version.id ||
    data.expectedRevision !== context.revision ||
    (request.sourceProgramVersionId !== version.id && !data.confirmStale)
  )
    throw changeConflict();
  const original = source.assignments.find(
    (a) =>
      a.id === request.assignmentId &&
      a.status === "published" &&
      a.registrationId === request.registrationId,
  );
  if (!original) throw changeConflict();
  const outgoing = acceptedUnit(source, request.registrationId);
  if (!outgoing || (outgoing.length > 1 && !data.confirmUnit))
    throw new AuthError(
      422,
      "Este participante tiene un vínculo obligatorio. El cambio debe resolverse considerando a ambos.",
    );
  const removed = source.assignments.filter(
    (a) =>
      a.status === "published" &&
      a.timeBlockId === original.timeBlockId &&
      outgoing.includes(a.registrationId),
  );
  if (
    removed.length !== outgoing.length ||
    removed.some((a) => a.pointId !== original.pointId)
  )
    throw changeConflict();
  const now = Timestamp.now(),
    nextVersion = version.version + 1;
  let incoming: string[] = [];
  if (data.replacementRegistrationId) {
    if (data.releaseWithoutReplacement)
      throw new AuthError(400, "Elige reemplazo o liberar, no ambos.");
    const available = reserves(source, version, original.timeBlockId);
    const unit = acceptedUnit(source, data.replacementRegistrationId);
    if (
      !unit ||
      unit.some((reg) => !available.some((r) => r.registrationId === reg))
    )
      throw new AuthError(
        422,
        "La reserva debe estar activa, disponible y sin asignación en este bloque.",
      );
    if (unit.length > 1 && !data.confirmUnit)
      throw new AuthError(
        422,
        "La reserva tiene un vínculo obligatorio. Confirma que ingresan ambos como unidad.",
      );
    incoming = unit;
  } else if (!data.releaseWithoutReplacement)
    throw new AuthError(
      422,
      "Confirma explícitamente liberar el turno sin reemplazo.",
    );
  const occupied = source.assignments.filter(
    (a) =>
      a.status === "published" &&
      a.timeBlockId === original.timeBlockId &&
      a.pointId === original.pointId &&
      !removed.some((r) => r.id === a.id),
  );
  const free = (
    [original.slotNumber, original.slotNumber === 1 ? 2 : 1] as (1 | 2)[]
  ).filter((slot) => !occupied.some((a) => a.slotNumber === slot));
  if (incoming.length > free.length)
    throw new AuthError(
      422,
      "El vínculo obligatorio entrante necesita dos slots compatibles en el mismo punto y bloque.",
    );
  if (data.maxTurnsOverrides.some((reg) => !incoming.includes(reg)))
    throw new AuthError(400, "Excepción no válida para esta resolución.");
  const added: Assignment[] = incoming.map((reg, index) => ({
    id: createHash("sha256")
      .update(JSON.stringify([id, nextVersion, reg]))
      .digest("hex"),
    campaignId,
    timeBlockId: original.timeBlockId,
    pointId: original.pointId,
    slotNumber: free[index],
    registrationId: reg,
    status: "published",
    version: 1,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
    availabilityOverride: false,
    maxTurnsOverride: data.maxTurnsOverrides.includes(reg),
  }));
  const assignments = source.assignments
    .map((a) =>
      removed.some((r) => r.id === a.id)
        ? { ...a, status: "cancelled" as const }
        : a,
    )
    .concat(added);
  const view = projectProgram(
    { ...source, assignments },
    { published: true, allowEmpty: true },
  );
  for (const regId of incoming) {
    const reg = source.registrations.get(regId)!;
    const count = new Set(
      context.turns
        .filter((t) => t.person.registrationId === regId)
        .map((t) => t.block.id),
    ).size;
    if (
      reg.maxTurns !== null &&
      count + 1 > reg.maxTurns &&
      !data.maxTurnsOverrides.includes(regId) &&
      !view.blockingErrors.some(
        (i) => i.code === "max_turns" && i.entityId === regId,
      )
    ) {
      view.blockingErrors.push({
        code: "max_turns",
        message:
          "El nuevo turno supera el máximo y requiere una excepción explícita.",
        entityId: regId,
        person: source.profiles.get(reg.participantId)?.fullName ?? "",
        date: "",
        hours: "",
        point: "",
      });
    }
  }
  view.snapshot = resultingSnapshot(
    version.snapshot,
    assignments,
    view.snapshot,
  );
  const versionRef = campaignsAdminDb()
    .collection(names.programVersions)
    .doc(programVersionId(campaignId, nextVersion));
  if ((await tx.get(versionRef)).exists) throw changeConflict();
  return {
    context,
    request,
    ref,
    now,
    nextVersion,
    versionRef,
    added,
    removed,
    view,
    assignments,
  };
}
export async function previewResolution(
  token: string,
  campaignId: string,
  id: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token);
  const parsed = resolveChangeSchema.safeParse(input);
  if (!parsed.success) throw new AuthError(400, "Resolución inválida.");
  return campaignsAdminDb().runTransaction(
    async (tx) => {
      const result = await resolution(tx, campaignId, id, parsed.data, uid);
      return { view: result.view, nextVersion: result.nextVersion };
    },
    { readOnly: true },
  );
}
export async function resolveChange(
  token: string,
  campaignId: string,
  id: string,
  input: unknown,
): Promise<ProgramView> {
  const uid = await authorizeCampaignDashboard(token);
  const parsed = resolveChangeSchema.safeParse(input);
  if (!parsed.success) throw new AuthError(400, "Resolución inválida.");
  const db = campaignsAdminDb();
  try {
    return await db.runTransaction(async (tx) => {
      const r = await resolution(tx, campaignId, id, parsed.data, uid);
      if (
        r.view.blockingErrors.length ||
        (r.view.warnings.length && !parsed.data.confirmWarnings)
      )
        throw new ProgramValidationError(r.view);
      const version: ProgramVersion = {
        id: r.versionRef.id,
        campaignId,
        version: r.nextVersion,
        status: "published",
        sourcePlannerRevision: r.view.plannerRevision!,
        publishedAt: r.now,
        publishedBy: uid,
        createdAt: r.now,
        snapshot: r.view.snapshot,
        warnings: r.view.warnings,
        assignmentCount: r.view.assignmentCount,
      };
      tx.create(r.versionRef, version);
      for (const a of r.removed) {
        tx.update(db.collection(names.assignments).doc(a.id), {
          status: "cancelled",
          version: a.version + 1,
          updatedAt: r.now,
          cancelledBy: uid,
          cancellationChangeRequestId: id,
          cancelledInVersion: r.nextVersion,
        });
        audit(
          tx,
          uid,
          campaignId,
          a.id,
          "post_publish_assignment_cancelled",
          r.nextVersion,
          r.now,
          { changeRequestId: id },
        );
      }
      for (const a of r.added) {
        tx.create(db.collection(names.assignments).doc(a.id), {
          ...a,
          sourceChangeRequestId: id,
          publishedInVersion: r.nextVersion,
        });
        audit(
          tx,
          uid,
          campaignId,
          a.id,
          "post_publish_assignment_created",
          r.nextVersion,
          r.now,
          { changeRequestId: id, maxTurnsOverride: a.maxTurnsOverride },
        );
      }
      tx.update(db.collection(names.campaigns).doc(campaignId), {
        currentProgramVersionId: version.id,
        programVersion: version.version,
        updatedProgramAt: r.now,
        updatedAt: r.now,
      });
      tx.set(r.context.source.lockRef, {
        revision: r.context.source.revision + 1,
        updatedAt: r.now,
      });
      tx.update(r.ref, {
        status: "resolved",
        organizerResponse: parsed.data.organizerResponse,
        resolvedAt: r.now,
        resolvedBy: uid,
        updatedAt: r.now,
        resolvedProgramVersionId: version.id,
      });
      audit(
        tx,
        uid,
        campaignId,
        id,
        "change_request_resolved",
        version.version,
        r.now,
        {
          programVersionId: version.id,
          reviewedStale: parsed.data.confirmStale,
        },
      );
      audit(
        tx,
        uid,
        campaignId,
        version.id,
        "program_version_created",
        version.version,
        r.now,
        { changeRequestId: id, previousProgramVersionId: r.context.version.id },
      );
      writeNotification(
        tx,
        id,
        r.request.participantId,
        campaignId,
        "change_request_resolved",
        "Tu solicitud fue resuelta. Revisa tu programa actualizado.",
        { requestId: id, version: version.version },
        r.now,
      );
      for (const regId of affectedRegistrations(
        r.context.version.snapshot,
        version.snapshot,
      )) {
        const participantId =
          r.context.source.registrations.get(regId)?.participantId;
        if (participantId)
          writeNotification(
            tx,
            version.id,
            participantId,
            campaignId,
            "assignment_changed",
            "Tu programa fue actualizado. Revisa tu turno.",
            { version: version.version },
            r.now,
          );
      }
      return publishedView(version);
    });
  } catch (error) {
    if (
      [10, "aborted", "ABORTED", 6, "ALREADY_EXISTS"].includes(
        (error as { code?: string | number }).code ?? "",
      )
    )
      throw changeConflict();
    throw error;
  }
}
