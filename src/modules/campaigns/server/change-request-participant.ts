import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { CampaignRegistration } from "../domain/registration";
import type { Assignment } from "../domain/planner";
import type { ChangeRequest } from "../domain/change-request";
import type { Campaign } from "../domain/types";
import { campaignCollections as names } from "../lib/paths";
import { createChangeSchema } from "../schemas/change-request-schemas";
import { participantAuth } from "./auth/session";
import { AuthError } from "./auth/service";
import { campaignsAdminDb } from "./firebase-admin";
import { readVersion } from "./program-service";
import {
  changeLockCollection,
  decodeTurn,
  snapshotTurns,
} from "./change-request-context";

export const changeRequestLimit = 10;
export async function createChangeRequest(token: string, input: unknown) {
  const auth = participantAuth();
  const current = await auth.current(token);
  if (!current)
    throw new AuthError(401, "Tu sesión venció. Ingresa nuevamente.");
  const parsed = createChangeSchema.safeParse(input);
  if (!parsed.success)
    throw new AuthError(
      400,
      "Solicitud inválida. El comentario permite hasta 500 caracteres.",
    );
  await auth.limit(
    "change-request-create",
    current.participant.id,
    changeRequestLimit,
  );
  const [campaignId, versionId, assignmentId] = decodeTurn(parsed.data.turnId);
  const db = campaignsAdminDb();
  return auth.withParticipantTransaction(token, async (tx, participant) => {
    const campaign = (
      await tx.get(db.collection(names.campaigns).doc(campaignId))
    ).data() as Campaign | undefined;
    if (
      campaign?.status !== "published" ||
      campaign.currentProgramVersionId !== versionId
    )
      throw new AuthError(
        409,
        "El turno ya no corresponde al programa actual. Actualiza tu programa.",
      );
    const version = await readVersion(tx, versionId, campaignId);
    const turn = snapshotTurns(version.snapshot).find(
      (t) => t.person.assignmentId === assignmentId,
    );
    if (!turn) throw new AuthError(404, "Turno no disponible.");
    const regDoc = await tx.get(
      db
        .collection(names.campaignRegistrations)
        .doc(turn.person.registrationId),
    );
    const reg = regDoc.exists
      ? ({ ...regDoc.data(), id: regDoc.id } as CampaignRegistration)
      : undefined;
    const assignment = (
      await tx.get(db.collection(names.assignments).doc(assignmentId))
    ).data() as Assignment | undefined;
    if (
      !reg ||
      reg.participantId !== participant.id ||
      reg.campaignId !== campaignId ||
      reg.registrationStatus !== "active" ||
      assignment?.status !== "published" ||
      assignment.registrationId !== turn.person.registrationId ||
      assignment.campaignId !== campaignId
    )
      throw new AuthError(404, "Turno no disponible.");
    const lockId = createHash("sha256")
      .update(JSON.stringify([reg.id, assignmentId]))
      .digest("hex");
    const lockRef = db.collection(changeLockCollection).doc(lockId);
    const lock = await tx.get(lockRef);
    // Query also detects legacy duplicates lacking a sentinel.
    const previous = await tx.get(
      db
        .collection(names.changeRequests)
        .where("assignmentId", "==", assignmentId),
    );
    if (
      previous.docs.some(
        (d) =>
          d.data().registrationId === reg.id &&
          ["pending", "approved"].includes(d.data().status),
      )
    )
      throw new AuthError(
        409,
        "Ya tienes una solicitud de cambio pendiente para este turno.",
      );
    const now = Timestamp.now(),
      ref = db.collection(names.changeRequests).doc();
    const request: ChangeRequest = {
      id: ref.id,
      campaignId,
      registrationId: reg.id,
      participantId: participant.id,
      assignmentId,
      sourceProgramVersionId: versionId,
      sourceProgramVersion: version.version,
      status: "pending",
      reasonCode: parsed.data.reasonCode,
      comment: parsed.data.comment,
      organizerResponse: "",
      createdAt: now,
      updatedAt: now,
    };
    tx.create(ref, request);
    tx.set(lockRef, {
      requestId: ref.id,
      revision: Number(lock.data()?.revision ?? 0) + 1,
      updatedAt: now,
    });
    tx.create(db.collection(names.auditLogs).doc(), {
      actorId: participant.id,
      campaignId,
      entityId: ref.id,
      action: "change_request_created",
      version: version.version,
      createdAt: now,
      metadata: { assignmentId },
    });
    return { id: ref.id, status: request.status };
  });
}
export async function participantChanges(token: string) {
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, participant) => {
      const db = campaignsAdminDb();
      const rows = await tx.get(
        db
          .collection(names.changeRequests)
          .where("participantId", "==", participant.id),
      );
      const result = [];
      for (const doc of rows.docs) {
        const request = doc.data() as ChangeRequest;
        const version = await readVersion(
          tx,
          request.sourceProgramVersionId,
          request.campaignId,
        );
        const turn = snapshotTurns(version.snapshot).find(
          (t) =>
            t.person.assignmentId === request.assignmentId &&
            t.person.registrationId === request.registrationId,
        );
        if (!turn) continue;
        result.push({
          id: doc.id,
          campaign: version.snapshot.campaign.name,
          turn: {
            date: turn.day.date,
            startTime: turn.block.startTime,
            endTime: turn.block.endTime,
            pointName:
              turn.day.points.find((p) => p.id === turn.cell.pointId)?.name ??
              "",
          },
          status: request.status,
          reasonCode: request.reasonCode,
          comment: request.comment,
          organizerResponse: request.organizerResponse,
          createdAt: request.createdAt.toDate().toISOString(),
          resolvedAt: request.resolvedAt?.toDate().toISOString() ?? null,
        });
      }
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  );
}
