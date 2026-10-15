import "server-only";
import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import type { Participant, ParticipantDTO } from "../domain/participant";
import type { CampaignRegistration, Availability, MaxTurns } from "../domain/registration";
import type { Campaign, CampaignDay, Congregation, Point, TimeBlock, BlockPoint } from "../domain/types";
import { calculateBlockCapacity } from "../domain/point-capacity";
import { campaignCollections as names } from "../lib/paths";
import { phoneSchema, pinSchema } from "../schemas/participant-auth";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";
import { AuthError, ParticipantAuthService } from "./auth/service";
import { availabilityId, registrationId } from "./registration-service";

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
};

const filtersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  congregationId: campaignDocumentIdSchema.optional(),
  dayId: campaignDocumentIdSchema.optional(),
  blockId: campaignDocumentIdSchema.optional(),
}).strict();
const changeSchema = z.object({
  selectedBlockIds: z.array(campaignDocumentIdSchema).max(200).refine((ids) => new Set(ids).size === ids.length, "No repitas horarios."),
  maxTurns: z.union([z.number().int().min(1).max(3), z.null()]),
  reason: z.string().trim().max(500).optional(),
}).strict();
const createSchema = z.object({
  action: z.enum(["create", "add_existing"]),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  pin: pinSchema.optional(),
  congregationId: campaignDocumentIdSchema,
  maxTurns: z.union([z.number().int().min(1).max(3), z.null()]),
  selectedBlockIds: z.array(campaignDocumentIdSchema).max(200).refine((ids) => new Set(ids).size === ids.length, "No repitas horarios."),
}).strict().superRefine((value, ctx) => {
  if (value.action === "create" && !value.pin)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pin"], message: "Ingresa un PIN inicial." });
  if (value.action === "add_existing" && value.pin)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pin"], message: "No cambies el PIN de una cuenta existente." });
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
    const profiles = new Map(profileDocs.filter((doc) => doc.exists).map((doc) => [doc.id, { ...doc.data(), id: doc.id } as Participant]));
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
    const acceptedPartners = new Map<string, string>();
    for (const doc of pairDocs.docs) {
      const pair = doc.data();
      if (pair.status === "accepted" && registrations.has(pair.requesterRegistrationId) && registrations.has(pair.recipientRegistrationId)) {
        acceptedPartners.set(pair.requesterRegistrationId, pair.recipientRegistrationId);
        acceptedPartners.set(pair.recipientRegistrationId, pair.requesterRegistrationId);
      }
    }
    return { campaign: { ...campaignDoc.data(), id: campaignId } as Campaign, registrations, profiles, congregations, associatedCongregations, days, blocks, activeBlocks, selections,
      points: pointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Point),
      blockPoints: blockPointDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as BlockPoint), acceptedPartners };
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

  async overview(token: string, campaignId: string) {
    return this.withAccess(token, campaignId, async (tx, _participant, access) => {
      const source = await this.source(tx, campaignId);
      const active = [...source.registrations.values()].filter((row) => row.registrationStatus === "active" && source.profiles.get(row.participantId)?.active);
      return { campaign: { id: campaignId, name: source.campaign.name, role: access.role, roleLabel: humanRole(access.role) }, participantCount: active.length, days: this.days(source), coverage: this.coverage(source) };
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
      const filters = parsed.data, source = await this.source(tx, campaignId);
      const rows = [...source.registrations.values()].filter((registration) => registration.registrationStatus === "active" && source.profiles.get(registration.participantId)?.active).map((registration) => {
        const row = this.person(source, registration.id); return { registrationId: registration.id, fullName: row.profile.fullName, congregationId: row.congregationId, congregation: row.congregation, availableBlockCount: [...(source.selections.get(registration.id) ?? [])].filter((id) => source.activeBlocks.has(id)).length, maxTurns: registration.maxTurns };
      }).filter((row) => {
        const selected = source.selections.get(row.registrationId) ?? new Set<string>();
        return (!filters.q || row.fullName.toLocaleLowerCase("es").includes(filters.q.toLocaleLowerCase("es"))) && (!filters.congregationId || row.congregationId === filters.congregationId) && (!filters.blockId || selected.has(filters.blockId)) && (!filters.dayId || [...selected].some((id) => source.activeBlocks.get(id)?.campaignDayId === filters.dayId));
      }).sort((a,b) => a.fullName.localeCompare(b.fullName, "es"));
      return { rows, total: rows.length, days: this.days(source), congregations: [...source.associatedCongregations].map(([id, row]) => ({ id, name: row.name })).sort((a,b) => a.name.localeCompare(b.name, "es")) };
    });
  }

  async detail(token: string, campaignId: string, registrationId: string) {
    return this.withAccess(token, campaignId, async (tx) => {
      const source = await this.source(tx, campaignId); const row = this.person(source, registrationId);
      if (row.registration.campaignId !== campaignId) throw new AuthError(404, "Participante no disponible.");
      const assignments = await tx.get(this.db.collection(names.assignments).where("campaignId", "==", campaignId).where("registrationId", "==", registrationId));
      const published = new Set(assignments.docs.filter((doc) => doc.data().status === "published").map((doc) => doc.data().timeBlockId as string));
      const partnerId = source.acceptedPartners.get(registrationId); const partner = partnerId ? this.person(source, partnerId) : null;
      return { registrationId, fullName: row.profile.fullName, phone: row.profile.phoneNormalized, congregation: row.congregation, congregationId: row.congregationId, maxTurns: row.registration.maxTurns, partner: partner ? { fullName: partner.profile.fullName, congregation: partner.congregation } : null,
        days: this.days(source).map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, available: source.selections.get(registrationId)?.has(block.id) ?? false, published: published.has(block.id) })) })) };
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
      const now = Timestamp.now();
      for (const blockId of new Set([...old, ...selected])) {
        const id = availabilityId(registrationId, blockId);
        tx.set(this.db.collection(names.availabilities).doc(id), { id, campaignId, registrationId, timeBlockId: blockId, available: selected.has(blockId), updatedAt: now }, { merge: true });
      }
      tx.update(this.db.collection(names.campaignRegistrations).doc(registrationId), { maxTurns: parsed.data.maxTurns, updatedAt: now });
      tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId: actor.id, action: "organization_update_availability", entityId: registrationId, metadata: { reason: parsed.data.reason ?? null }, createdAt: now });
      return { ok: true, message: "Cambios guardados." };
    });
  }

  async availableForBlock(token: string, campaignId: string, blockId: string) {
    return this.withAccess(token, campaignId, async (tx) => {
      const source = await this.source(tx, campaignId); if (!source.activeBlocks.has(blockId)) throw new AuthError(404, "Horario no disponible.");
      return [...source.registrations.values()].filter((row) => row.registrationStatus === "active" && source.profiles.get(row.participantId)?.active && source.selections.get(row.id)?.has(blockId)).map((row) => { const person = this.person(source, row.id); return { registrationId: row.id, fullName: person.profile.fullName, congregation: person.congregation }; }).sort((a,b) => a.fullName.localeCompare(b.fullName, "es"));
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
      fullName: existing.fullName,
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
        if (value.action === "create") return { kind: current ? "already_registered" as const : "existing" as const, registrationId: current?.id ?? null, fullName: existing.fullName };
        if (current) return { kind: "already_registered" as const, registrationId: current.id, fullName: existing.fullName };
        return this.addRegistration(tx, campaignId, existing, value, actor.id, "organization_add_existing_participant");
      });
    }
    if (value.action !== "create" || !value.pin) throw new AuthError(400, "Ingresa el PIN inicial para crear la cuenta.");
    const actor = await this.withAccess(token, campaignId, async (_tx, participant) => participant);
    const participant = await this.auth.createForOrganizer({ fullName: value.fullName, phone: value.phone, pin: value.pin, congregationId: value.congregationId }, actor.id);
    return this.withAccess(token, campaignId, async (tx, verifiedActor) => {
      const source = await validate(tx);
      const currentDoc = await tx.get(this.db.collection(names.campaignRegistrations).doc(registrationId(campaignId, participant.id)));
      const current = currentDoc.exists ? { id: currentDoc.id } : [...source.registrations.values()].find((row) => row.participantId === participant.id);
      if (current) return { kind: "already_registered" as const, registrationId: current.id, fullName: participant.fullName };
      return this.addRegistration(tx, campaignId, participant, value, verifiedActor.id, "organization_create_participant");
    });
  }

  private addRegistration(
    tx: Transaction,
    campaignId: string,
    participant: Participant,
    value: z.infer<typeof createSchema>,
    actorParticipantId: string,
    event: "organization_create_participant" | "organization_add_existing_participant",
  ) {
    const id = registrationId(campaignId, participant.id), now = Timestamp.now();
    const registration: CampaignRegistration = { id, campaignId, participantId: participant.id, congregationId: value.congregationId, maxTurns: value.maxTurns as MaxTurns, registrationStatus: "active", createdAt: now, updatedAt: now };
    tx.create(this.db.collection(names.campaignRegistrations).doc(id), registration);
    for (const blockId of value.selectedBlockIds) {
      const availability: Availability = { id: availabilityId(id, blockId), campaignId, registrationId: id, timeBlockId: blockId, available: true, createdAt: now, updatedAt: now };
      tx.set(this.db.collection(names.availabilities).doc(availability.id), availability);
    }
    tx.create(this.db.collection(names.auditLogs).doc(), { campaignId, actorParticipantId, action: event, entityId: id, metadata: { participantId: participant.id }, createdAt: now });
    return { kind: "created" as const, registrationId: id, fullName: participant.fullName };
  }
}
