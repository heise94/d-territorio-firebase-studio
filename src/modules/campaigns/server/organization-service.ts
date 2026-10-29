import "server-only";
import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import type { Participant, ParticipantDTO } from "../domain/participant";
import type { CampaignRegistration, Availability } from "../domain/registration";
import type { Campaign, CampaignDay, Congregation, Point, TimeBlock, BlockPoint } from "../domain/types";
import { calculateBlockCapacity } from "../domain/point-capacity";
import { campaignCollections as names } from "../lib/paths";
import { participantName } from "../lib/presentation";
import { matchesParticipantSearch } from "../lib/participant-search";
import { reserveAvailabilityPlaces } from "./availability-capacity";
import { normalizePersonName, phoneSchema, pinSchema } from "../schemas/participant-auth";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";
import { AuthError, ParticipantAuthService } from "./auth/service";
import { availabilityId, registrationId } from "./registration-service";
import { acceptedPairKey, pairLockCollection } from "./pair-request-service";
import type { PairRequest } from "../domain/pair-request";
import { getPlannerDay, createAssignment, changeAssignment, type TrustedPlannerActor } from "./planner-service";
import { getDraftProgramForOrganization, publishProgram } from "./program-service";
import { revokeParticipantAdminSessions } from "./auth/session";

type TeamRecord = {
  campaignId: string;
  primaryRegistrationId: string | null;
  helperRegistrationIds: string[];
};
type OrganizationRole = "CAMPAIGN_ADMIN" | "CAMPAIGN_HELPER";
type Source = {
  campaign: Campaign;
  registrations: Map<string, CampaignRegistration>;
  profiles: Map<string, Participant>;
  congregations: Map<string, Congregation>;
  associatedCongregations: Map<string, Congregation>;
  days: Map<string, CampaignDay>;
  blocks: Map<string, TimeBlock>;
  activeBlocks: Map<string, TimeBlock>;
  selections: Map<string, Set<string>>;
  points: Point[];
  blockPoints: BlockPoint[];
  acceptedPartners: Map<string, string>;
  pairs: PairRequest[];
};

const filtersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  congregationId: campaignDocumentIdSchema.optional(),
  dayId: campaignDocumentIdSchema.optional(),
  blockId: campaignDocumentIdSchema.optional(),
  showAllCongregations: z.enum(["true"]).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
}).strict();
const changeSchema = z.object({
  selectedBlockIds: z.array(campaignDocumentIdSchema).max(200).refine((ids) => new Set(ids).size === ids.length, "No repitas horarios."),
  maxTurns: z.union([z.number().int().min(1).max(3), z.null()]).optional(),
  reason: z.string().trim().max(500).optional(),
}).strict();
const createSchema = z.object({
  action: z.enum(["create", "add_existing"]),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  pin: pinSchema.optional(),
  congregationId: campaignDocumentIdSchema,
  maxTurns: z.union([z.number().int().min(1).max(3), z.null()]).optional(),
  selectedBlockIds: z.array(campaignDocumentIdSchema).max(200).refine((ids) => new Set(ids).size === ids.length, "No repitas horarios."),
}).strict().superRefine((value, ctx) => {
  if (value.action === "create" && !value.pin)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pin"], message: "Ingresa un PIN inicial." });
  if (value.action === "add_existing" && value.pin)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pin"], message: "No cambies el PIN de una cuenta existente." });
});
const partnerSchema = z.object({ recipientRegistrationId: campaignDocumentIdSchema.optional() }).strict();
const manualPlannerPersonSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  congregationId: campaignDocumentIdSchema,
  phone: phoneSchema.optional(),
  pin: pinSchema.optional(),
  timeBlockId: campaignDocumentIdSchema,
}).strict().superRefine((value, ctx) => {
  if (value.pin && !value.phone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Para crear acceso con PIN, ingresa también el teléfono." });
});

const humanRole = (role: OrganizationRole) => role === "CAMPAIGN_ADMIN" ? "Administrador principal" : "Ayudante";

export class CampaignOrganizationService {
  constructor(private readonly db: Firestore, private readonly auth: ParticipantAuthService) {}

  private validCampaign(campaignId: string) {
    if (!campaignDocumentIdSchema.safeParse(campaignId).success)
      throw new AuthError(400, "Campaña inválida.");
  }

  private async access(tx: Transaction, participant: ParticipantDTO, campaignId: string) {
    this.validCampaign(campaignId);
    const registrations = await tx.get(this.db.collection(names.campaignRegistrations)
      .where("participantId", "==", participant.id));
    const own = registrations.docs.filter((doc) => doc.data().campaignId === campaignId && doc.data().registrationStatus === "active");
    const team = (await tx.get(this.db.collection(names.campaignTeams).doc(campaignId))).data() as TeamRecord | undefined;
    if (!team || !own.length)
      throw new AuthError(403, "Tu cuenta no tiene acceso a la organización de esta campaña.");
    const ids = new Set(own.map((doc) => doc.id));
    const role: OrganizationRole | null = team.primaryRegistrationId && ids.has(team.primaryRegistrationId)
      ? "CAMPAIGN_ADMIN"
      : team.helperRegistrationIds.some((id) => ids.has(id)) ? "CAMPAIGN_HELPER" : null;
    if (!role)
      throw new AuthError(403, "Tu cuenta no tiene acceso a la organización de esta campaña.");
    return { role, registrationId: own.find((doc) => ids.has(doc.id))!.id };
  }

  private async withAccess<T>(token: string, campaignId: string, operation: (tx: Transaction, participant: ParticipantDTO, access: { role: OrganizationRole; registrationId: string }) => Promise<T>) {
    return this.auth.withParticipantTransaction(token, async (tx, participant) =>
      operation(tx, participant, await this.access(tx, participant, campaignId)));
  }

  private async plannerActor(token: string, campaignId: string): Promise<TrustedPlannerActor> {
    return this.withAccess(token, campaignId, async (_tx, participant, access) => ({ uid: participant.id, role: access.role }));
  }

  async resetParticipantPin(token: string, campaignId: string, registrationId: string, newPin: string) {
    const actorId = await this.withAccess(token, campaignId, async (_tx, participant) => participant.id);
    await this.auth.resetCampaignPin(campaignId, registrationId, newPin, actorId, async (tx) => {
      const participant = await this.auth.participantForTransaction(tx, token);
      if (participant.id !== actorId) throw new AuthError(403, "Tu sesión cambió. Ingresa nuevamente.");
      await this.access(tx, participant, campaignId);
      const grants = await tx.get(this.db.collection(names.organizerUsers).where("uid", "==", participant.id));
      return { superAdmin: grants.docs.some((doc) => doc.data().active === true && doc.data().role === "SUPER_ADMIN") };
    }, revokeParticipantAdminSessions);
    return { ok: true };
  }

  async planner(token: string, campaignId: string, dayId?: string) {
    const actor = await this.plannerActor(token, campaignId);
    const [view, congregations] = await Promise.all([
      getPlannerDay("", campaignId, dayId, actor),
      this.withAccess(token, campaignId, async (tx) => {
        const source = await this.source(tx, campaignId);
        return [...source.associatedCongregations].map(([id, row]) => ({ id, name: row.name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
      }),
    ]);
    return { ...view, congregations };
  }
  async assignPlanner(token: string, campaignId: string, input: unknown) {
    const actor = await this.plannerActor(token, campaignId);
    return createAssignment("", campaignId, input, actor);
  }
  async changePlannerAssignment(token: string, campaignId: string, assignmentId: string, input: unknown) {
    const actor = await this.plannerActor(token, campaignId);
    return changeAssignment("", campaignId, assignmentId, input, actor);
  }
  async draftProgram(token: string, campaignId: string) {
    const actor = await this.plannerActor(token, campaignId);
    return getDraftProgramForOrganization(campaignId, actor);
  }
  async publishDraft(token: string, campaignId: string, input: unknown) {
    const actor = await this.plannerActor(token, campaignId);
    return publishProgram("", campaignId, input, actor);
  }
  async addManualPlannerPerson(token: string, campaignId: string, input: unknown) {
    const parsed = manualPlannerPersonSchema.safeParse(input);
    if (!parsed.success) throw new AuthError(400, parsed.error.issues[0]?.message ?? "Revisa los datos.");
    const value = parsed.data;
    const actor = await this.withAccess(token, campaignId, async (tx, participant, access) => {
      const source = await this.source(tx, campaignId);
      if (!source.associatedCongregations.has(value.congregationId)) throw new AuthError(400, "Selecciona una congregación de esta campaña.");
      if (!source.activeBlocks.has(value.timeBlockId)) throw new AuthError(400, "Selecciona un horario activo de esta campaña.");
      return { participantId: participant.id, role: access.role };
    });
    const fullName = normalizePersonName(value.fullName);
    let profile: Participant;
    if (value.phone) {
      if (await this.auth.findByPhone(value.phone)) throw new AuthError(409, "Ese teléfono ya pertenece a una cuenta. Agrégala desde Participantes para conservar sus datos.");
      profile = await this.auth.createForOrganizer({ fullName, phone: value.phone, pin: value.pin, congregationId: value.congregationId }, actor.participantId);
    } else {
      const ref = this.db.collection(names.participants).doc();
      const now = Timestamp.now();
      profile = { id: ref.id, fullName, congregationId: value.congregationId, active: true, sessionVersion: 0, createdAt: now, updatedAt: now };
      await ref.create(profile);
    }
    return this.withAccess(token, campaignId, async (tx, verifiedActor) => {
      const source = await this.source(tx, campaignId);
      if (!source.associatedCongregations.has(value.congregationId) || !source.activeBlocks.has(value.timeBlockId)) throw new AuthError(409, "La campaña cambió. Actualiza e intenta nuevamente.");
      const id = registrationId(campaignId, profile.id);
      const existing = await tx.get(this.db.collection(names.campaignRegistrations).doc(id));
      if (existing.exists) throw new AuthError(409, "Esta persona ya está inscrita en la campaña.");
      const now = Timestamp.now();
      const registration: CampaignRegistration = { id, campaignId, participantId: profile.id, congregationId: value.congregationId, maxTurns: null, registrationStatus: "active", createdAt: now, updatedAt: now };
      tx.create(this.db.collection(names.campaignRegistrations).doc(id), registration);
      const availability: Availability = { id: availabilityId(id, value.timeBlockId), campaignId, registrationId: id, timeBlockId: value.timeBlockId, available: true, createdAt: now, updatedAt: now };
      tx.create(this.db.collection(names.availabilities).doc(availability.id), availability);
      tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId: verifiedActor.id, action: "organization_manual_planner_participant_created", entityId: id, metadata: { participantId: profile.id, congregationId: value.congregationId, timeBlockId: value.timeBlockId, accountCreated: !!(value.phone && value.pin) }, createdAt: now });
      return { registrationId: id, fullName, accountCreated: !!(value.phone && value.pin) };
    });
  }

  async campaigns(token: string) {
    return this.auth.withParticipantTransaction(token, async (tx, participant) => {
      const registrations = await tx.get(this.db.collection(names.campaignRegistrations)
        .where("participantId", "==", participant.id));
      const active = registrations.docs.filter((doc) => doc.data().registrationStatus === "active");
      if (!active.length) return [];
      const teams = await tx.getAll(...active.map((doc) => this.db.collection(names.campaignTeams).doc(doc.data().campaignId)));
      const result: { id: string; name: string; role: OrganizationRole; roleLabel: string }[] = [];
      for (const [index, teamDoc] of teams.entries()) {
        const registration = active[index];
        if (!teamDoc.exists) continue;
        const team = teamDoc.data() as TeamRecord;
        const role: OrganizationRole | null = team.primaryRegistrationId === registration.id
          ? "CAMPAIGN_ADMIN"
          : team.helperRegistrationIds.includes(registration.id) ? "CAMPAIGN_HELPER" : null;
        if (!role) continue;
        const campaign = await tx.get(this.db.collection(names.campaigns).doc(registration.data().campaignId));
        if (campaign.exists) result.push({ id: campaign.id, name: String(campaign.data()?.name ?? "Campaña"), role, roleLabel: humanRole(role) });
      }
      return result.sort((a, b) => a.name.localeCompare(b.name, "es"));
    });
  }

  private async source(tx: Transaction, campaignId: string): Promise<Source> {
    const query = (collection: string) => tx.get(this.db.collection(collection).where("campaignId", "==", campaignId));
    const [campaignDoc, registrationDocs, availabilityDocs, dayDocs, blockDocs, pointDocs, blockPointDocs, pairDocs, associationDocs] = await Promise.all([
      tx.get(this.db.collection(names.campaigns).doc(campaignId)), query(names.campaignRegistrations), query(names.availabilities), query(names.campaignDays), query(names.timeBlocks), query(names.points), query(names.blockPoints), query(names.pairRequests), query(names.campaignCongregations),
    ]);
    if (!campaignDoc.exists) throw new AuthError(404, "Campaña no disponible.");
    const registrations = new Map(registrationDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as CampaignRegistration]));
    const participantIds = [...new Set([...registrations.values()].map((row) => row.participantId))];
    const profileDocs = participantIds.length ? await tx.getAll(...participantIds.map((id) => this.db.collection(names.participants).doc(id))) : [];
    const profiles = new Map(profileDocs.filter((doc) => doc.exists).map((doc) => { const profile = doc.data() as Participant; return [doc.id, { ...profile, id: doc.id, fullName: participantName(profile) }]; }));
    const associatedIds = new Set(associationDocs.docs.map((doc) => doc.data().congregationId as string));
    const congregationIds = [...new Set([...associatedIds, ...[...profiles.values()].map((profile) => profile.congregationId).filter((id): id is string => !!id), ...[...registrations.values()].map((row) => row.congregationId).filter((id): id is string => !!id)])];
    const congregationDocs = congregationIds.length ? await tx.getAll(...congregationIds.map((id) => this.db.collection(names.congregations).doc(id))) : [];
    const congregations = new Map(congregationDocs.filter((doc) => doc.exists).map((doc) => [doc.id, { ...doc.data(), id: doc.id } as Congregation]));
    const associatedCongregations = new Map([...congregations].filter(([id, row]) => associatedIds.has(id) && row.active));
    const days = new Map(dayDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as CampaignDay]));
    const blocks = new Map(blockDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as TimeBlock]));
    const activeBlocks = new Map([...blocks].filter(([, block]) => block.active && days.get(block.campaignDayId)?.active));
    const selections = new Map<string, Set<string>>();
    for (const doc of availabilityDocs.docs) {
      const availability = doc.data() as Availability;
      if (!availability.available || !registrations.has(availability.registrationId)) continue;
      const selected = selections.get(availability.registrationId) ?? new Set<string>();
      selected.add(availability.timeBlockId); selections.set(availability.registrationId, selected);
    }
    const pairs = pairDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as PairRequest);
    const acceptedPartners = new Map<string, string>();
    for (const pair of pairs) {
      if (pair.status === "accepted" && registrations.has(pair.requesterRegistrationId) && registrations.has(pair.recipientRegistrationId)) {
        acceptedPartners.set(pair.requesterRegistrationId, pair.recipientRegistrationId);
        acceptedPartners.set(pair.recipientRegistrationId, pair.requesterRegistrationId);
      }
    }
    return { campaign: { ...campaignDoc.data(), id: campaignId } as Campaign, registrations, profiles, congregations, associatedCongregations, days, blocks, activeBlocks, selections,
      points: pointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Point),
      blockPoints: blockPointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as BlockPoint), acceptedPartners, pairs };
  }

  private person(source: Source, registrationId: string) {
    const registration = source.registrations.get(registrationId);
    const profile = registration ? source.profiles.get(registration.participantId) : undefined;
    if (!registration || !profile) throw new AuthError(404, "Participante no disponible.");
    const congregationId = registration.congregationId ?? profile.congregationId;
    return { registration, profile, congregationId: congregationId ?? null, congregation: congregationId ? source.congregations.get(congregationId)?.name ?? "Sin congregación" : "Sin congregación" };
  }

  private days(source: Source) {
    return [...source.days.values()].filter((day) => day.active).sort((a,b) => a.date.localeCompare(b.date)).map((day) => ({ id: day.id, date: day.date, label: day.label ?? "", blocks: [...source.activeBlocks.values()].filter((block) => block.campaignDayId === day.id).sort((a,b) => a.startTime.localeCompare(b.startTime)).map((block) => ({ id: block.id, startTime: block.startTime, endTime: block.endTime, label: block.label ?? "" })) }));
  }

  private async participantMetadata(tx: Transaction, campaignId: string) {
    const query = (collection: string) => tx.get(this.db.collection(collection).where("campaignId", "==", campaignId));
    const [campaignDoc, registrationDocs, availabilityDocs, dayDocs, blockDocs, associationDocs] = await Promise.all([
      tx.get(this.db.collection(names.campaigns).doc(campaignId)),
      query(names.campaignRegistrations), query(names.availabilities), query(names.campaignDays),
      query(names.timeBlocks), query(names.campaignCongregations),
    ]);
    if (!campaignDoc.exists) throw new AuthError(404, "Campaña no disponible.");
    const active = registrationDocs.docs.filter((doc) => doc.data().registrationStatus === "active");
    const activeIds = new Set(active.map((doc) => doc.id));
    const profileDocs = active.length
      ? await tx.getAll(...active.map((doc) => this.db.collection(names.participants).doc(String(doc.data().participantId)))) : [];
    const profileCongregations = new Map(profileDocs.filter((doc) => doc.exists)
      .map((doc) => [doc.id, String(doc.data()?.congregationId ?? "")]));
    const days = new Map(dayDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as CampaignDay]));
    const blocks = new Map(blockDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as TimeBlock]));
    const activeBlocks = new Map([...blocks].filter(([, block]) => block.active && days.get(block.campaignDayId)?.active));
    const selected = new Map<string, Set<string>>();
    for (const doc of availabilityDocs.docs) {
      const row = doc.data() as Availability;
      if (!row.available || !activeIds.has(row.registrationId) || !activeBlocks.has(row.timeBlockId)) continue;
      const registrations = selected.get(row.registrationId) ?? new Set<string>();
      registrations.add(row.timeBlockId); selected.set(row.registrationId, registrations);
    }
    const congregationIds = [...new Set(associationDocs.docs.map((doc) => doc.data().congregationId as string))];
    const congregationDocs = congregationIds.length
      ? await tx.getAll(...congregationIds.map((id) => this.db.collection(names.congregations).doc(id))) : [];
    const congregations = new Map(congregationDocs.filter((doc) => doc.exists && doc.data()?.active)
      .map((doc) => [doc.id, doc.data() as Congregation]));
    const activeDays = [...days.values()].filter((day) => day.active).sort((a, b) => a.date.localeCompare(b.date));
    const dayDtos = activeDays.map((day) => ({
      id: day.id, date: day.date, label: day.label ?? "",
      blocks: [...activeBlocks.values()].filter((block) => block.campaignDayId === day.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)).map((block) => ({
          id: block.id, startTime: block.startTime, endTime: block.endTime, label: block.label ?? "",
          count: active.filter((registration) => selected.get(registration.id)?.has(block.id)).length,
        })),
      count: active.filter((registration) => [...(selected.get(registration.id) ?? [])]
        .some((blockId) => activeBlocks.get(blockId)?.campaignDayId === day.id)).length,
    }));
    return {
      total: active.length,
      days: dayDtos,
      congregations: [...congregations].map(([id, congregation]) => ({
        id, name: congregation.name,
        count: active.filter((registration) => (registration.data().congregationId ?? profileCongregations.get(String(registration.data().participantId))) === id).length,
      })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    };
  }

  private async overviewMetadata(tx: Transaction, campaignId: string) {
    const query = (collection: string) => tx.get(this.db.collection(collection).where("campaignId", "==", campaignId));
    const [campaignDoc, registrationDocs, availabilityDocs, dayDocs, blockDocs, pointDocs, blockPointDocs] = await Promise.all([
      tx.get(this.db.collection(names.campaigns).doc(campaignId)), query(names.campaignRegistrations),
      query(names.availabilities), query(names.campaignDays), query(names.timeBlocks), query(names.points), query(names.blockPoints),
    ]);
    if (!campaignDoc.exists) throw new AuthError(404, "Campaña no disponible.");
    const active = registrationDocs.docs.filter((doc) => doc.data().registrationStatus === "active");
    const activeIds = new Set(active.map((doc) => doc.id));
    const days = new Map(dayDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as CampaignDay]));
    const blocks = new Map(blockDocs.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id } as TimeBlock]));
    const activeBlocks = [...blocks.values()].filter((block) => block.active && days.get(block.campaignDayId)?.active);
    const selected = new Map<string, Set<string>>();
    for (const doc of availabilityDocs.docs) {
      const row = doc.data() as Availability;
      if (!row.available || !activeIds.has(row.registrationId)) continue;
      const registrations = selected.get(row.registrationId) ?? new Set<string>();
      registrations.add(row.timeBlockId); selected.set(row.registrationId, registrations);
    }
    const points = pointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Point);
    const blockPoints = blockPointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as BlockPoint);
    const coverage = activeBlocks.map((block) => {
      const available = active.filter((registration) => selected.get(registration.id)?.has(block.id)).length;
      const minimum = calculateBlockCapacity(campaignId, block.id, points, blockPoints).minParticipants;
      return { available, minimum };
    });
    return {
      campaign: { ...campaignDoc.data(), id: campaignId } as Campaign,
      participantCount: active.length,
      days: [...days.values()].filter((day) => day.active).sort((a, b) => a.date.localeCompare(b.date)).map((day) => ({
        id: day.id, date: day.date, label: day.label ?? "",
        blocks: activeBlocks.filter((block) => block.campaignDayId === day.id).sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((block) => ({
            id: block.id, startTime: block.startTime, endTime: block.endTime, label: block.label ?? "",
            count: active.filter((registration) => selected.get(registration.id)?.has(block.id)).length,
            minimum: calculateBlockCapacity(campaignId, block.id, points, blockPoints).minParticipants,
          })),
      })),
      coverageSummary: { total: coverage.length, missing: coverage.filter((block) => block.available < block.minimum).length },
    };
  }

  async overview(token: string, campaignId: string) {
    return this.withAccess(token, campaignId, async (tx, _participant, access) => {
      const overview = await this.overviewMetadata(tx, campaignId);
      return {
        campaign: { id: campaignId, name: overview.campaign.name, status: overview.campaign.status, role: access.role, roleLabel: humanRole(access.role) },
        participantCount: overview.participantCount,
        days: overview.days,
        coverageSummary: overview.coverageSummary,
      };
    });
  }

  async coverageOverview(token: string, campaignId: string) {
    return this.withAccess(token, campaignId, async (tx) => {
      const source = await this.source(tx, campaignId);
      return { coverage: this.coverage(source) };
    });
  }

  private coverage(source: Source) {
    return this.days(source).map((day) => ({ ...day, blocks: day.blocks.map((block) => {
      const available = [...source.registrations.values()].filter((row) => row.registrationStatus === "active" && source.profiles.get(row.participantId)?.active && source.selections.get(row.id)?.has(block.id)).length;
      const capacity = calculateBlockCapacity(source.campaign.id, block.id, source.points, source.blockPoints);
      return { ...block, available, minimum: capacity.minParticipants, state: available >= capacity.minParticipants ? "covered" : "missing", missing: Math.max(capacity.minParticipants - available, 0) };
    }) }));
  }

  async participants(token: string, campaignId: string, input: unknown) {
    return this.withAccess(token, campaignId, async (tx) => {
      const parsed = filtersSchema.safeParse(input); if (!parsed.success) throw new AuthError(400, "Revisa los filtros de participantes.");
      const filters = parsed.data;
      const hasFilter = Boolean(filters.q || filters.congregationId || filters.dayId || filters.blockId || filters.showAllCongregations);
      if (!hasFilter) {
        const metadata = await this.participantMetadata(tx, campaignId);
        return { rows: [], resultTotal: 0, hasMore: false, page: filters.page, ...metadata };
      }
      const source = await this.source(tx, campaignId);
      const all = [...source.registrations.values()].filter((registration) => registration.registrationStatus === "active" && source.profiles.get(registration.participantId)?.active).map((registration) => {
        const row = this.person(source, registration.id); return { registrationId: registration.id, fullName: row.profile.fullName, congregationId: row.congregationId, congregation: row.congregation, availableBlockCount: [...(source.selections.get(registration.id) ?? [])].filter((id) => source.activeBlocks.has(id)).length };
      });
      const matchingRows = all.filter((row) => {
        const selected = source.selections.get(row.registrationId) ?? new Set<string>();
        const profile = source.profiles.get(source.registrations.get(row.registrationId)?.participantId ?? "");
        return matchesParticipantSearch(row.fullName, profile?.phoneNormalized, filters.q) && (!filters.congregationId || row.congregationId === filters.congregationId) && (!filters.blockId || selected.has(filters.blockId)) && (!filters.dayId || [...selected].some((id) => source.activeBlocks.get(id)?.campaignDayId === filters.dayId));
      }).sort((a,b) => a.fullName.localeCompare(b.fullName, "es"));
      const pageSize = 20;
      const rows = hasFilter ? matchingRows.slice((filters.page - 1) * pageSize, filters.page * pageSize) : [];
      return { rows, total: all.length, resultTotal: hasFilter ? matchingRows.length : 0, hasMore: hasFilter && matchingRows.length > filters.page * pageSize, page: filters.page, days: this.days(source).map((day) => ({ ...day, count: all.filter((row) => [...(source.selections.get(row.registrationId) ?? [])].some((id) => source.activeBlocks.get(id)?.campaignDayId === day.id)).length, blocks: day.blocks.map((block) => ({ ...block, count: all.filter((row) => source.selections.get(row.registrationId)?.has(block.id)).length })) })), congregations: [...source.associatedCongregations].map(([id, row]) => ({ id, name: row.name, count: all.filter((person) => person.congregationId === id).length })).sort((a,b) => a.name.localeCompare(b.name, "es")) };
    });
  }

  async detail(token: string, campaignId: string, registrationId: string) {
    return this.withAccess(token, campaignId, async (tx) => {
      const source = await this.source(tx, campaignId); const row = this.person(source, registrationId);
      if (row.registration.campaignId !== campaignId) throw new AuthError(404, "Participante no disponible.");
      const assignments = await tx.get(this.db.collection(names.assignments).where("campaignId", "==", campaignId).where("registrationId", "==", registrationId));
      const published = new Set(assignments.docs.filter((doc) => doc.data().status === "published").map((doc) => doc.data().timeBlockId as string));
      const partnerId = source.acceptedPartners.get(registrationId); const partner = partnerId ? this.person(source, partnerId) : null;
      return { registrationId, fullName: row.profile.fullName, phone: row.profile.phoneNormalized, congregation: row.congregation, congregationId: row.congregationId, partner: partner ? { fullName: partner.profile.fullName, congregation: partner.congregation } : null,
        days: this.days(source).map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, available: source.selections.get(registrationId)?.has(block.id) ?? false, published: published.has(block.id),
          companions: source.pairs.filter((pair) => (pair.status === "accepted" || pair.status === "pending") && (!pair.timeBlockId || pair.timeBlockId === block.id) && [pair.requesterRegistrationId, pair.recipientRegistrationId].includes(registrationId)).map((pair) => {
            const otherId = pair.requesterRegistrationId === registrationId ? pair.recipientRegistrationId : pair.requesterRegistrationId;
            const other = source.registrations.get(otherId);
            const profile = other ? source.profiles.get(other.participantId) : null;
            return `${profile?.fullName ?? "Participante no disponible"} · ${pair.status === "accepted" ? "Confirmado" : "Pendiente de confirmación"}`;
          }),
        })) })) };
    });
  }

  async updateAvailability(token: string, campaignId: string, registrationId: string, input: unknown) {
    const parsed = changeSchema.safeParse(input); if (!parsed.success) throw new AuthError(400, "Revisa la disponibilidad.");
    return this.withAccess(token, campaignId, async (tx, actor) => {
      const source = await this.source(tx, campaignId); const row = this.person(source, registrationId);
      if (row.registration.campaignId !== campaignId || row.registration.registrationStatus !== "active") throw new AuthError(404, "Participante no disponible.");
      const selected = new Set(parsed.data.selectedBlockIds); if ([...selected].some((id) => !source.activeBlocks.has(id))) throw new AuthError(400, "Uno de los horarios ya no está disponible.");
      const assignments = await tx.get(this.db.collection(names.assignments).where("campaignId", "==", campaignId).where("registrationId", "==", registrationId));
      const published = new Set(assignments.docs.filter((doc) => doc.data().status === "published").map((doc) => doc.data().timeBlockId as string));
      const old = source.selections.get(registrationId) ?? new Set<string>();
      for (const blockId of published) if (old.has(blockId) && !selected.has(blockId)) throw new AuthError(400, "Este hermano ya tiene un turno publicado en este horario.");
      await reserveAvailabilityPlaces(tx, this.db, campaignId, [...selected].filter((id) => !old.has(id)));
      const now = Timestamp.now();
      for (const blockId of new Set([...old, ...selected])) {
        const id = availabilityId(registrationId, blockId);
        tx.set(this.db.collection(names.availabilities).doc(id), { id, campaignId, registrationId, timeBlockId: blockId, available: selected.has(blockId), updatedAt: now }, { merge: true });
      }
      tx.update(this.db.collection(names.campaignRegistrations).doc(registrationId), { maxTurns: null, updatedAt: now });
      tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId: actor.id, action: "organization_update_availability", entityId: registrationId, metadata: { reason: parsed.data.reason ?? null }, createdAt: now });
      return { ok: true, message: "Cambios guardados." };
    });
  }

  async availableForBlock(token: string, campaignId: string, blockId: string) {
    return this.withAccess(token, campaignId, async (tx) => {
      const source = await this.source(tx, campaignId); if (!source.activeBlocks.has(blockId)) throw new AuthError(404, "Horario no disponible.");
      const points = source.blockPoints.filter((row) => row.timeBlockId === blockId && row.active).map((row) => source.points.find((point) => point.id === row.pointId)).filter((point): point is Point => !!point && point.active).map((point) => ({ name: point.name, minimum: point.minParticipants ?? 0 }));
      const participants = [...source.registrations.values()].filter((row) => row.registrationStatus === "active" && source.profiles.get(row.participantId)?.active && source.selections.get(row.id)?.has(blockId)).map((row) => { const person = this.person(source, row.id); return { registrationId: row.id, fullName: person.profile.fullName, congregation: person.congregation }; }).sort((a,b) => a.fullName.localeCompare(b.fullName, "es"));
      return { participants, points };
    });
  }

  async setPartner(token: string, campaignId: string, registrationId: string, input: unknown) {
    const parsed = partnerSchema.safeParse(input); if (!parsed.success) throw new AuthError(400, "Revisa el compañero seleccionado.");
    return this.withAccess(token, campaignId, async (tx, actor) => {
      const source = await this.source(tx, campaignId); const own = this.person(source, registrationId);
      if (own.registration.campaignId !== campaignId || own.registration.registrationStatus !== "active") throw new AuthError(404, "Participante no disponible.");
      const current = source.pairs.find((pair) => pair.status === "accepted" && (pair.requesterRegistrationId === registrationId || pair.recipientRegistrationId === registrationId));
      const now = Timestamp.now();
      if (!parsed.data.recipientRegistrationId) {
        if (current) {
          tx.update(this.db.collection(names.pairRequests).doc(current.id), { status: "cancelled", updatedAt: now, respondedAt: now });
          tx.delete(this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, current.requesterRegistrationId, current.timeBlockId)));
          tx.delete(this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, current.recipientRegistrationId, current.timeBlockId)));
        }
        return { ok: true };
      }
      const recipientId = parsed.data.recipientRegistrationId;
      if (recipientId === registrationId) throw new AuthError(400, "No puedes elegir a la misma persona.");
      const recipient = this.person(source, recipientId);
      if (recipient.registration.campaignId !== campaignId || recipient.registration.registrationStatus !== "active") throw new AuthError(404, "Participante no disponible.");
      const recipientCurrent = source.pairs.find((pair) => pair.status === "accepted" && (pair.requesterRegistrationId === recipientId || pair.recipientRegistrationId === recipientId));
      if (recipientCurrent && recipientCurrent.id !== current?.id) throw new AuthError(409, "Esta persona ya tiene un compañero acordado.");
      if (current?.requesterRegistrationId === registrationId && current.recipientRegistrationId === recipientId) return { ok: true };
      if (current) {
        tx.update(this.db.collection(names.pairRequests).doc(current.id), { status: "cancelled", updatedAt: now, respondedAt: now });
        tx.delete(this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, current.requesterRegistrationId, current.timeBlockId)));
        tx.delete(this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, current.recipientRegistrationId, current.timeBlockId)));
      }
      const firstLock = this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, registrationId));
      const secondLock = this.db.collection(pairLockCollection).doc(acceptedPairKey(campaignId, recipientId));
      if ((await tx.get(firstLock)).exists || (await tx.get(secondLock)).exists) throw new AuthError(409, "Uno de los hermanos ya tiene un compañero acordado.");
      const ref = this.db.collection(names.pairRequests).doc();
      tx.create(ref, { id: ref.id, campaignId, requesterRegistrationId: registrationId, recipientRegistrationId: recipientId, status: "accepted", createdAt: now, updatedAt: now, respondedAt: now });
      tx.create(firstLock, { campaignId, requestId: ref.id, createdAt: now }); tx.create(secondLock, { campaignId, requestId: ref.id, createdAt: now });
      tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId: actor.id, action: "organization_partner_set", entityId: ref.id, createdAt: now });
      return { ok: true };
    });
  }

  async lookupParticipant(token: string, campaignId: string, phone: string) {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) throw new AuthError(400, "Ingresa un teléfono móvil chileno válido.");
    const { source, actorId } = await this.withAccess(token, campaignId, async (tx, actor) => ({ source: await this.source(tx, campaignId), actorId: actor.id }));
    if (source.campaign.status !== "registration_open") throw new AuthError(409, "Las inscripciones de esta campaña no están abiertas.");
    await this.auth.limit("organization-phone-lookup", actorId, 60);
    const existing = await this.auth.findByPhone(parsed.data);
    if (!existing) return { kind: "new" as const, phone: parsed.data };
    const registration = [...source.registrations.values()].find((row) => row.participantId === existing.id);
    const preferred = registration?.congregationId ?? existing.congregationId;
    return {
      kind: registration ? "already_registered" as const : "existing" as const,
      fullName: participantName(existing),
      phone: parsed.data,
      congregationId: preferred && source.associatedCongregations.has(preferred) ? preferred : null,
      registrationId: registration?.id ?? null,
    };
  }

  async createParticipant(token: string, campaignId: string, input: unknown) {
    const parsed = createSchema.safeParse(input); if (!parsed.success) throw new AuthError(400, parsed.error.issues[0]?.message ?? "Revisa los datos.");
    const value = parsed.data;
    const validate = async (tx: Transaction) => {
      const source = await this.source(tx, campaignId);
      if (source.campaign.status !== "registration_open") throw new AuthError(409, "Las inscripciones de esta campaña no están abiertas.");
      if (!source.associatedCongregations.has(value.congregationId)) throw new AuthError(400, "Selecciona una congregación de esta campaña.");
      if (value.selectedBlockIds.some((id) => !source.activeBlocks.has(id))) throw new AuthError(400, "Uno de los horarios ya no está disponible.");
      return source;
    };
    // Check access before looking up a phone, including the create path.
    await this.withAccess(token, campaignId, async (tx) => { await validate(tx); });
    const existing = await this.auth.findByPhone(value.phone);
    if (existing) {
      return this.withAccess(token, campaignId, async (tx, actor) => {
        const source = await validate(tx);
        const currentDoc = await tx.get(this.db.collection(names.campaignRegistrations).doc(registrationId(campaignId, existing.id)));
        const current = currentDoc.exists ? { id: currentDoc.id } : [...source.registrations.values()].find((row) => row.participantId === existing.id);
        if (value.action === "create") return { kind: current ? "already_registered" as const : "existing" as const, registrationId: current?.id ?? null, fullName: participantName(existing) };
        if (current) return { kind: "already_registered" as const, registrationId: current.id, fullName: participantName(existing) };
        return this.addRegistration(tx, campaignId, existing, value, actor.id, "organization_add_existing_participant");
      });
    }
    if (value.action !== "create" || !value.pin) throw new AuthError(400, "Ingresa el PIN inicial para crear la cuenta.");
    const actor = await this.withAccess(token, campaignId, async (_tx, participant) => participant);
    const participant = await this.auth.createForOrganizer({ fullName: normalizePersonName(value.fullName), phone: value.phone, pin: value.pin, congregationId: value.congregationId }, actor.id);
    return this.withAccess(token, campaignId, async (tx, verifiedActor) => {
      const source = await validate(tx);
      const currentDoc = await tx.get(this.db.collection(names.campaignRegistrations).doc(registrationId(campaignId, participant.id)));
      const current = currentDoc.exists ? { id: currentDoc.id } : [...source.registrations.values()].find((row) => row.participantId === participant.id);
      if (current) return { kind: "already_registered" as const, registrationId: current.id, fullName: participant.fullName };
      return this.addRegistration(tx, campaignId, participant, value, verifiedActor.id, "organization_create_participant");
    });
  }

  private async addRegistration(
    tx: Transaction,
    campaignId: string,
    participant: Participant,
    value: z.infer<typeof createSchema>,
    actorParticipantId: string,
    event: "organization_create_participant" | "organization_add_existing_participant",
  ) {
    const id = registrationId(campaignId, participant.id), now = Timestamp.now();
    // Organization staff may register additional volunteers after coverage is
    // reached. The selected blocks are an explicit admin decision and are kept
    // in the audit trail; public participant signup still uses the normal cap.
    const capacityOverrides = await reserveAvailabilityPlaces(tx, this.db, campaignId, value.selectedBlockIds, true);
    const registration: CampaignRegistration = { id, campaignId, participantId: participant.id, congregationId: value.congregationId, maxTurns: null, registrationStatus: "active", createdAt: now, updatedAt: now };
    tx.create(this.db.collection(names.campaignRegistrations).doc(id), registration);
    for (const blockId of value.selectedBlockIds) {
      const availability: Availability = { id: availabilityId(id, blockId), campaignId, registrationId: id, timeBlockId: blockId, available: true, createdAt: now, updatedAt: now };
      tx.set(this.db.collection(names.availabilities).doc(availability.id), availability);
    }
    tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId, action: event, entityId: id, metadata: { participantId: participant.id, selectedBlockIds: value.selectedBlockIds, capacityOverrides }, createdAt: now });
    return { kind: "created" as const, registrationId: id, fullName: participant.fullName };
  }
}
