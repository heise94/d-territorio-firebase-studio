import "server-only";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import type { ChangeRequest } from "../domain/change-request";
import { campaignCollections as names } from "../lib/paths";
import { decideChangeSchema } from "../schemas/change-request-schemas";
import { AuthError } from "./auth/service";
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import { campaignsAdminDb } from "./firebase-admin";
import { acceptedUnit } from "./planner-source";
import { readVersion } from "./program-service";
import {
  changeConflict,
  officialContext,
  readChange,
  reserves,
  snapshotTurns,
} from "./change-request-context";
import { writeNotification } from "./change-notifications";

export async function adminChanges(
  token: string,
  campaignId: string,
  requestId?: string,
) {
  await authorizeCampaignDashboard(token);
  const db = campaignsAdminDb();
  return db.runTransaction(
    async (tx) => {
      const context = await officialContext(tx, campaignId);
      const rows = await tx.get(
        db
          .collection(names.changeRequests)
          .where("campaignId", "==", campaignId),
      );
      const result = [];
      for (const doc of rows.docs) {
        const request = doc.data() as ChangeRequest;
        if (requestId && doc.id !== requestId) continue;
        const version =
          request.sourceProgramVersionId === context.version.id
            ? context.version
            : await readVersion(tx, request.sourceProgramVersionId, campaignId);
        const turn = snapshotTurns(version.snapshot).find(
          (t) => t.person.assignmentId === request.assignmentId,
        );
        const reg = context.source.registrations.get(request.registrationId);
        const unit = acceptedUnit(context.source, request.registrationId);
        const currentTurn = context.turns.find(
          (t) =>
            t.person.assignmentId === request.assignmentId &&
            t.person.registrationId === request.registrationId,
        );
        result.push({
          currentTurn: currentTurn
            ? {
                date: currentTurn.day.date,
                startTime: currentTurn.block.startTime,
                endTime: currentTurn.block.endTime,
                pointName:
                  currentTurn.day.points.find(
                    (p) => p.id === currentTurn.cell.pointId,
                  )?.name ?? "",
                companion:
                  currentTurn.cell.slots[currentTurn.slotNumber === 1 ? 1 : 0]
                    ?.fullName ?? "Pendiente",
              }
            : null,
          id: doc.id,
          registrationId: request.registrationId,
          participant: turn?.person.fullName ?? "Persona no disponible",
          congregation: turn?.person.congregation ?? "",
          status: request.status,
          reasonCode: request.reasonCode,
          comment: request.comment,
          organizerResponse: request.organizerResponse,
          sourceProgramVersion: request.sourceProgramVersion,
          stale: request.sourceProgramVersionId !== context.version.id,
          createdAt: request.createdAt.toDate().toISOString(),
          resolvedAt: request.resolvedAt?.toDate().toISOString() ?? null,
          turn: turn
            ? {
                dayId: turn.day.id,
                blockId: turn.block.id,
                date: turn.day.date,
                startTime: turn.block.startTime,
                endTime: turn.block.endTime,
                pointName:
                  turn.day.points.find((p) => p.id === turn.cell.pointId)
                    ?.name ?? "",
                companion:
                  turn.cell.slots[turn.slotNumber === 1 ? 1 : 0]?.fullName ??
                  "Pendiente",
              }
            : null,
          acceptedUnit: unit?.length === 2,
          maxTurns: reg?.maxTurns ?? null,
          reserves:
            requestId && turn
              ? reserves(context.source, context.version, turn.block.id)
              : [],
          capacity: turn
            ? (context.source.blocks.get(turn.block.id)?.capacityOverride ??
              context.source.campaign.defaultCapacityPerBlock ??
              null)
            : null,
        });
      }
      const rank = { pending: 0, approved: 1, rejected: 2, resolved: 3 };
      if (requestId && !result.length)
        throw new AuthError(404, "Solicitud no disponible.");
      return {
        campaign: {
          id: campaignId,
          name: context.version.snapshot.campaign.name,
        },
        currentProgramVersionId: context.version.id,
        expectedProgramVersion: context.version.version,
        expectedRevision: context.revision,
        pendingCount: rows.docs.filter((d) =>
          ["pending", "approved"].includes(d.data().status),
        ).length,
        requests: result.sort(
          (a, b) =>
            rank[a.status] - rank[b.status] ||
            a.createdAt.localeCompare(b.createdAt),
        ),
      };
    },
    { readOnly: true },
  );
}
export function changeAudit(
  tx: Transaction,
  uid: string,
  campaignId: string,
  entityId: string,
  action: string,
  version: number,
  now: Timestamp,
  metadata: Record<string, unknown> = {},
) {
  tx.create(campaignsAdminDb().collection(names.auditLogs).doc(), {
    actorId: uid,
    campaignId,
    entityId,
    action,
    version,
    createdAt: now,
    metadata,
  });
}
export async function decideChange(
  token: string,
  campaignId: string,
  id: string,
  action: "approve" | "reject",
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token);
  const parsed = decideChangeSchema.safeParse(input);
  if (!parsed.success)
    throw new AuthError(400, "Respuesta inválida (máximo 500 caracteres).");
  const db = campaignsAdminDb();
  return db.runTransaction(async (tx) => {
    const { request, ref } = await readChange(tx, campaignId, id);
    const campaign = await tx.get(
      db.collection(names.campaigns).doc(campaignId),
    );
    if (campaign.data()?.status !== "published") throw changeConflict();
    if (request.status !== "pending")
      throw new AuthError(
        409,
        "La solicitud ya fue respondida. Actualiza antes de continuar.",
      );
    const now = Timestamp.now(),
      status = action === "approve" ? "approved" : "rejected";
    // Deliberately no Assignment, ProgramVersion, reserve or campaign pointer writes.
    tx.update(ref, {
      status,
      organizerResponse: parsed.data.organizerResponse,
      updatedAt: now,
      ...(action === "reject" ? { resolvedAt: now, resolvedBy: uid } : {}),
    });
    changeAudit(
      tx,
      uid,
      campaignId,
      id,
      `change_request_${status}`,
      request.sourceProgramVersion,
      now,
    );
    writeNotification(
      tx,
      id,
      request.participantId,
      campaignId,
      `change_request_${status}`,
      status === "approved"
        ? "Tu solicitud fue aprobada y está siendo gestionada. El programa todavía no cambia."
        : "Tu solicitud fue rechazada. Revisa la respuesta en Mi programa.",
      { requestId: id },
      now,
    );
    return { id, status };
  });
}
