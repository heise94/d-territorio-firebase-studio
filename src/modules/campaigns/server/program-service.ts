import "server-only";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { campaignCollections as names } from "../lib/paths";
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
import { authorizeCampaignDashboard } from "./admin-dashboard-authorization";
import { campaignsAdminDb } from "./firebase-admin";
import { readPlannerSource } from "./planner-source";
import { projectProgram } from "./program-projection";

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
  })
  .strict();
export const programVersionId = (campaignId: string) => `${campaignId}__v1`;
async function draftSource(tx: Transaction, campaignId: string) {
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
function publishedView(version: ProgramVersion): ProgramView {
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
async function readVersion(tx: Transaction, id: string, campaignId: string) {
  const doc = await tx.get(
    campaignsAdminDb().collection(names.programVersions).doc(id),
  );
  const data = doc.data() as ProgramVersion | undefined;
  if (!data || data.campaignId !== campaignId || data.status !== "published")
    throw new AuthError(503, "El programa publicado no está disponible.");
  return data;
}
export async function getProgram(token: string, campaignId: string) {
  await authorizeCampaignDashboard(token);
  const db = campaignsAdminDb();
  return db.runTransaction(
    async (tx) => {
      const doc = await tx.get(db.collection(names.campaigns).doc(campaignId));
      if (!doc.exists) throw new AuthError(404, "Campaña no disponible.");
      const campaign = doc.data()!;
      if (campaign.status === "published")
        return publishedView(
          await readVersion(tx, campaign.currentProgramVersionId, campaignId),
        );
      return projectProgram(await draftSource(tx, campaignId));
    },
    { readOnly: true },
  );
}
export async function publishProgram(
  token: string,
  campaignId: string,
  input: unknown,
) {
  const uid = await authorizeCampaignDashboard(token);
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success)
    throw new AuthError(400, "Datos de publicación inválidos.");
  const db = campaignsAdminDb();
  try {
    return await db.runTransaction(async (tx) => {
      const source = await draftSource(tx, campaignId);
      const versionRef = db
        .collection(names.programVersions)
        .doc(programVersionId(campaignId));
      const previous = await tx.get(versionRef);
      if (
        previous.exists ||
        !canTransitionCampaignStatus(
          source.campaign.status,
          "published",
          "publication",
        ) ||
        source.campaign.status !== "planning"
      )
        throw conflict();
      const view = projectProgram(source);
      if (view.plannerRevision !== parsed.data.expectedPlannerRevision)
        throw conflict();
      if (
        view.blockingErrors.length ||
        (view.warnings.length && !parsed.data.confirmWarnings)
      )
        throw new ProgramValidationError(view);
      const now = Timestamp.now();
      const version: ProgramVersion = {
        id: versionRef.id,
        campaignId,
        version: 1,
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
      for (const a of source.assignments.filter((a) => a.status === "draft"))
        tx.update(db.collection(names.assignments).doc(a.id), {
          status: "published",
          version: a.version + 1,
          updatedAt: now,
        });
      tx.update(db.collection(names.campaigns).doc(campaignId), {
        status: "published",
        publishedAt: now,
        currentProgramVersionId: versionRef.id,
        programVersion: 1,
        updatedAt: now,
      });
      tx.set(source.lockRef, { revision: source.revision + 1, updatedAt: now });
      tx.create(db.collection(names.auditLogs).doc(), {
        campaignId,
        actorId: uid,
        action: "program_published",
        entityId: versionRef.id,
        metadata: {
          programVersionId: versionRef.id,
          version: 1,
          assignmentCount: view.assignmentCount,
          publishedAt: now,
        },
        createdAt: now,
      });
      tx.create(db.collection(names.auditLogs).doc(), {
        campaignId,
        actorId: uid,
        action: "campaign_status_changed",
        entityId: campaignId,
        metadata: { from: "planning", to: "published" },
        createdAt: now,
      });
      return publishedView(version);
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
      const ids = [...new Set(registrations.map((r) => r.campaignId))].sort();
      if (!ids.length) return { campaigns: [] };
      const campaigns = await tx.getAll(
        ...ids.map((id) => db.collection(names.campaigns).doc(id)),
      );
      const published = campaigns.filter(
        (doc) => doc.exists && doc.data()?.status === "published",
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
        if (data.status !== "published") {
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
                date: day.date,
                dayLabel: day.label,
                startTime: block.startTime,
                endTime: block.endTime,
                blockLabel: block.label,
                pointName: point.name,
                locationText: point.locationText,
                description: point.description,
                companionName:
                  cell.slots[index === 0 ? 1 : 0]?.fullName ?? null,
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
