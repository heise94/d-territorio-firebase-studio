import "server-only";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignCollections as names } from "../lib/paths";
import { formatPersonName } from "../lib/presentation";
import { canTransitionCampaignStatus } from "../domain/campaign-status";
import {
  publicationConflictMessage,
  type ProgramVersion,
  type ProgramView,
  type PersonalProgram,
} from "../domain/program";
import type { PairRequest } from "../domain/pair-request";
import type { CampaignRegistration } from "../domain/registration";
import { AuthError } from "./auth/service";
import { participantAuth } from "./auth/session";
import { campaignsAdminDb } from "./firebase-admin";
import { requireCampaignAccess } from "./campaign-access";
import { readPlannerSource } from "./planner-source";
import { projectProgram } from "./program-projection";
import { turnId } from "./program-turn-locator";
import { writeDomainNotification } from "./notification-events";
import { affectedRegistrations } from "./change-notifications";
import type { TrustedPlannerActor } from "./planner-service";

const conflict = () => new AuthError(409, publicationConflictMessage);
export class ProgramValidationError extends AuthError {
  constructor(public view: ProgramView) {
    super(
      422,
      view.blockingErrors.length
        ? "Corrige los errores antes de publicar."
        : "Confirma explícitamente las advertencias antes de publicar.",
    );
  }
}
const publishSchema = z
  .object({
    expectedPlannerRevision: z.string().regex(/^[a-f0-9]{64}$/),
    confirmWarnings: z.boolean().default(false),
    confirmBlockingErrors: z.boolean().default(false),
  })
  .strict();
export const programVersionId = (campaignId: string, version = 1) =>
  `${campaignId}__v${version}`;
export async function draftSource(tx: Transaction, campaignId: string) {
  const db = campaignsAdminDb();
  const source = await readPlannerSource(db, tx, campaignId);
  // Dashboard intentionally filters invalid references. Publication must not hide them.
  const raw = await tx.get(
    db.collection(names.pairRequests).where("campaignId", "==", campaignId),
  );
  source.pairs = raw.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as PairRequest,
  );
  return source;
}
export function publishedView(version: ProgramVersion): ProgramView {
  return {
    mode: "published",
    campaignStatus: "published",
    version: version.version,
    publishedAt: version.publishedAt.toDate().toISOString(),
    plannerRevision: null,
    snapshot: version.snapshot,
    blockingErrors: [],
    warnings: version.warnings,
    assignmentCount: version.assignmentCount,
  };
}
/** Draft projection used by the authenticated organization workspace preview. */
export async function getDraftProgramForOrganization(campaignId: string, actor: TrustedPlannerActor) {
  if (!["SUPER_ADMIN", "CAMPAIGN_ADMIN", "CAMPAIGN_HELPER"].includes(actor.role)) throw new AuthError(403, "Sin permiso para consultar el borrador.");
  const db = campaignsAdminDb();
  return db.runTransaction(async (tx) => {
    const source = await draftSource(tx, campaignId);
    const publicationSource = source.campaign.currentProgramVersionId
      ? { ...source, assignments: source.assignments.filter((assignment) => assignment.status !== "cancelled").map((assignment) => ({ ...assignment, status: "published" as const })) }
      : source;
    return projectProgram(publicationSource, { published: !!source.campaign.currentProgramVersionId, allowEmpty: true });
  }, { readOnly: true });
}
export async function readVersion(
  tx: Transaction,
  id: string,
  campaignId: string,
) {
  const doc = await tx.get(
    campaignsAdminDb().collection(names.programVersions).doc(id),
  );
  const data = doc.data() as ProgramVersion | undefined;
  if (!data || data.campaignId !== campaignId || data.status !== "published")
    throw new AuthError(503, "El programa publicado no está disponible.");
  return data;
}
export async function getProgram(
  token: string,
  campaignId: string,
  selectedVersion?: number,
  trustedActor?: TrustedPlannerActor,
) {
  if (trustedActor) {
    if (!["SUPER_ADMIN", "CAMPAIGN_ADMIN", "CAMPAIGN_HELPER"].includes(trustedActor.role)) throw new AuthError(403, "Sin permiso para consultar el programa.");
  } else await requireCampaignAccess(campaignsAdminDb(), token, campaignId, ["SUPER_ADMIN", "CAMPAIGN_ADMIN"]);
  const db = campaignsAdminDb();
  return db.runTransaction(
    async (tx) => {
      const doc = await tx.get(db.collection(names.campaigns).doc(campaignId));
      if (!doc.exists) throw new AuthError(404, "Campaña no disponible.");
      const campaign = doc.data()!;
      if (selectedVersion !== undefined) {
        if (!Number.isSafeInteger(selectedVersion) || selectedVersion < 1)
          throw new AuthError(400, "Versión inválida.");
        return publishedView(
          await readVersion(
            tx,
            programVersionId(campaignId, selectedVersion),
            campaignId,
          ),
        );
      }
      if (["published", "active", "completed"].includes(campaign.status) || campaign.currentProgramVersionId) {
        const current = await readVersion(tx, campaign.currentProgramVersionId, campaignId);
        const source = await draftSource(tx, campaignId);
        const previewSource = {
          ...source,
          assignments: source.assignments
            .filter((assignment) => assignment.status !== "cancelled")
            .map((assignment) => ({ ...assignment, status: "published" as const })),
        };
        const preview = projectProgram(previewSource, { published: true, allowEmpty: true });
        const hasChanges = JSON.stringify(preview.snapshot) !== JSON.stringify(current.snapshot) ||
          JSON.stringify(preview.warnings) !== JSON.stringify(current.warnings) ||
          preview.assignmentCount !== current.assignmentCount;
        return {
          ...publishedView(current),
          campaignStatus: campaign.status,
          update: {
            hasChanges,
            plannerRevision: preview.plannerRevision!,
            assignmentCount: preview.assignmentCount,
            blockingErrors: preview.blockingErrors,
            warnings: preview.warnings,
          },
        };
      }
      return projectProgram(await draftSource(tx, campaignId));
    },
    { readOnly: true },
  );
}
export async function publishProgram(
  token: string,
  campaignId: string,
  input: unknown,
  trustedActor?: TrustedPlannerActor,
) {
  const uid = trustedActor
    ? (trustedActor.role === "SUPER_ADMIN" || trustedActor.role === "CAMPAIGN_ADMIN" || trustedActor.role === "CAMPAIGN_HELPER" ? trustedActor.uid : (() => { throw new AuthError(403, "Sin permiso para publicar el programa."); })())
    : (await requireCampaignAccess(campaignsAdminDb(), token, campaignId, ["SUPER_ADMIN", "CAMPAIGN_ADMIN"])).uid;
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success)
    throw new AuthError(400, "Datos de publicación inválidos.");
  const db = campaignsAdminDb();
  try {
    return await db.runTransaction(async (tx) => {
      const source = await draftSource(tx, campaignId);
      const currentStatus = source.campaign.status;
      const firstPublication = !source.campaign.currentProgramVersionId;
      if (!firstPublication && !["published", "active", "registration_open"].includes(currentStatus))
        throw conflict();
      if (firstPublication && !canTransitionCampaignStatus(currentStatus, "published", "publication"))
        throw conflict();
      const campaignDoc = await tx.get(db.collection(names.campaigns).doc(campaignId));
      if (!campaignDoc.exists) throw new AuthError(404, "Campaña no disponible.");
      let previousVersion: ProgramVersion | null = null;
      if (!firstPublication) {
        previousVersion = await readVersion(tx, campaignDoc.data()!.currentProgramVersionId, campaignId);
      }
      const nextVersion = firstPublication ? 1 : previousVersion!.version + 1;
      const versionRef = db.collection(names.programVersions).doc(programVersionId(campaignId, nextVersion));
      if ((await tx.get(versionRef)).exists) throw conflict();
      const publicationSource = firstPublication ? source : {
        ...source,
        assignments: source.assignments
          .filter((assignment) => assignment.status !== "cancelled")
          .map((assignment) => ({ ...assignment, status: "published" as const })),
      };
      // Publishing is an explicit administrative decision. Keep every issue in
      // the preview and require acknowledgement, but do not make incomplete
      // coverage a technical lock on releasing the program.
      const view = projectProgram(publicationSource, { published: !firstPublication, allowEmpty: true });
      if (view.plannerRevision !== parsed.data.expectedPlannerRevision)
        throw conflict();
      if (
        (view.blockingErrors.length && !parsed.data.confirmBlockingErrors) ||
        (view.warnings.length && !parsed.data.confirmWarnings)
      )
        throw new ProgramValidationError(view);
      if (previousVersion &&
        JSON.stringify(view.snapshot) === JSON.stringify(previousVersion.snapshot) &&
        JSON.stringify(view.warnings) === JSON.stringify(previousVersion.warnings) &&
        view.assignmentCount === previousVersion.assignmentCount)
        throw conflict();
      const now = Timestamp.now();
      const version: ProgramVersion = {
        id: versionRef.id,
        campaignId,
        version: nextVersion,
        status: "published",
        sourcePlannerRevision: view.plannerRevision!,
        publishedAt: now,
        publishedBy: uid,
        createdAt: now,
        snapshot: view.snapshot,
        warnings: view.warnings,
        assignmentCount: view.assignmentCount,
      };
      tx.create(versionRef, version);
      const affected = firstPublication
        ? new Set(source.assignments.filter((a) => a.status === "draft").map((a) => a.registrationId))
        : new Set(affectedRegistrations(previousVersion!.snapshot, version.snapshot));
      const publishedParticipants = new Set([...affected]
        .map((registrationId) => source.registrations.get(registrationId)?.participantId)
        .filter((id): id is string => !!id));
      for (const participantId of publishedParticipants)
        writeDomainNotification(
          tx,
          db,
          versionRef.id,
          participantId,
          campaignId,
          firstPublication ? "program_published" : "assignment_changed",
          firstPublication ? "El programa fue publicado. Revisa tus turnos." : "Tu programa fue actualizado. Revisa tus turnos.",
          { version: nextVersion },
          now,
          "/campanas/mi-programa",
          firstPublication ? "Programa publicado" : "Tu programa fue actualizado",
        );
      for (const a of source.assignments.filter((a) => a.status === "draft"))
        tx.update(db.collection(names.assignments).doc(a.id), {
          status: "published",
          version: a.version + 1,
          updatedAt: now,
          publishedInVersion: nextVersion,
        });
      tx.update(db.collection(names.campaigns).doc(campaignId), {
        ...(firstPublication ? { status: "published", publishedAt: now } : {}),
        currentProgramVersionId: versionRef.id,
        programVersion: nextVersion,
        updatedProgramAt: now,
        updatedAt: now,
      });
      tx.set(source.lockRef, { revision: source.revision + 1, updatedAt: now });
      tx.create(db.collection(names.auditLogs).doc(), {
        campaignId,
        actorId: uid,
        action: firstPublication ? "program_published" : "program_version_created",
        entityId: versionRef.id,
        metadata: {
          programVersionId: versionRef.id,
          version: nextVersion,
          assignmentCount: view.assignmentCount,
          publishedAt: now,
        },
        createdAt: now,
      });
      if (firstPublication) tx.create(db.collection(names.auditLogs).doc(), {
          campaignId,
          actorId: uid,
          action: "campaign_status_changed",
          entityId: campaignId,
          metadata: { from: "planning", to: "published" },
          createdAt: now,
        });
      return { ...publishedView(version), campaignStatus: currentStatus === "planning" ? "published" : currentStatus };
    });
  } catch (error) {
    if (
      [10, "aborted", "ABORTED", 6, "ALREADY_EXISTS"].includes(
        (error as { code?: string | number }).code ?? "",
      )
    )
      throw conflict();
    throw error;
  }
}
export async function getPersonalProgram(
  token: string,
  hasIdentityParameters = false,
  includeChangeContext = false,
): Promise<PersonalProgram> {
  return participantAuth().withParticipantTransaction(
    token,
    async (tx, participant) => {
      if (hasIdentityParameters)
        throw new AuthError(
          400,
          "La identidad se obtiene de tu sesión, no de parámetros.",
        );
      const db = campaignsAdminDb();
      const rows = await tx.get(
        db
          .collection(names.campaignRegistrations)
          .where("participantId", "==", participant.id),
      );
      const registrations = rows.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as CampaignRegistration,
      );
      const openChanges = includeChangeContext
        ? (
            await tx.get(
              db
                .collection(names.changeRequests)
                .where("participantId", "==", participant.id),
            )
          ).docs
            .map((doc) => doc.data())
            .filter(
              (row) => row.status === "pending" || row.status === "approved",
            )
        : [];
      const ids = [...new Set(registrations.map((r) => r.campaignId))].sort();
      if (!ids.length) return { campaigns: [] };
      const campaigns = await tx.getAll(
        ...ids.map((id) => db.collection(names.campaigns).doc(id)),
      );
      const published = campaigns.filter(
        (doc) =>
          doc.exists &&
          (["published", "active", "completed"].includes(doc.data()?.status) || !!doc.data()?.currentProgramVersionId),
      );
      const versions = published.length
        ? await tx.getAll(
            ...published.map((doc) =>
              db
                .collection(names.programVersions)
                .doc(doc.data()!.currentProgramVersionId),
            ),
          )
        : [];
      const result: PersonalProgram = { campaigns: [] };
      for (const campaign of campaigns.filter((doc) => doc.exists)) {
        const data = campaign.data()!;
        if (!["published", "active", "completed"].includes(data.status) && !data.currentProgramVersionId) {
          result.campaigns.push({
            name: data.name,
            published: false,
            version: null,
            publishedAt: null,
            turns: [],
          });
          continue;
        }
        const doc = versions.find((v) => v.id === data.currentProgramVersionId);
        const version = doc?.data() as ProgramVersion | undefined;
        if (
          !version ||
          version.campaignId !== campaign.id ||
          version.status !== "published"
        )
          throw new AuthError(503, "El programa publicado no está disponible.");
        const own = new Set(
          registrations
            .filter((r) => r.campaignId === campaign.id)
            .map((r) => r.id),
        );
        const turns: PersonalProgram["campaigns"][number]["turns"] = [];
        for (const day of version.snapshot.days)
          for (const block of day.blocks)
            for (const cell of block.cells) {
              const index = cell.slots.findIndex(
                (slot) => slot && own.has(slot.registrationId),
              );
              if (index < 0) continue;
              const point = day.points.find((p) => p.id === cell.pointId)!;
              turns.push({
                turnId: turnId(version, cell.slots[index]!.assignmentId),
                ...(includeChangeContext
                  ? (() => {
                      const request = openChanges.find(
                        (row) =>
                          row.assignmentId ===
                            cell.slots[index]!.assignmentId &&
                          row.registrationId ===
                            cell.slots[index]!.registrationId,
                      );
                      return {
                        canRequestChange:
                          data.status === "published" &&
                          !request &&
                          registrations.some(
                            (reg) =>
                              reg.id === cell.slots[index]!.registrationId &&
                              reg.registrationStatus === "active",
                          ),
                        ...(request
                          ? {
                              changeRequestStatus: request.status as
                                | "pending"
                                | "approved",
                            }
                          : {}),
                      };
                    })()
                  : {}),
                date: day.date,
                dayLabel: day.label,
                startTime: block.startTime,
                endTime: block.endTime,
                blockLabel: block.label,
                pointId: point.id,
                pointName: point.name,
                locationText: point.locationText,
                description: point.description,
                companionName: (() => {
                  const name = cell.slots[index === 0 ? 1 : 0]?.fullName;
                  return name || null;
                })(),
              });
            }
        result.campaigns.push({
          name: version.snapshot.campaign.name,
          published: true,
          version: version.version,
          publishedAt: version.publishedAt.toDate().toISOString(),
          turns,
        });
      }
      return result;
    },
  );
}
