import "server-only";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import type { CampaignRegistration } from "../domain/registration";
import type { Participant } from "../domain/participant";
import type { Congregation } from "../domain/types";
import { campaignCollections as names } from "../lib/paths";
import { formatPersonName } from "../lib/presentation";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";
import { AuthError } from "./auth/service";
import { requireCampaignAccess } from "./campaign-access";

const changeSchema = z.object({
  action: z.enum(["setPrimary", "clearPrimary", "addHelper", "removeHelper"]),
  registrationId: z.string().min(1).max(180).optional(),
  expectedRevision: z.number().int().min(0),
}).strict();

interface TeamRecord {
  campaignId: string;
  primaryRegistrationId: string | null;
  helperRegistrationIds: string[];
  revision: number;
}

const empty = (campaignId: string): TeamRecord => ({
  campaignId,
  primaryRegistrationId: null,
  helperRegistrationIds: [],
  revision: 0,
});

export class CampaignTeamService {
  constructor(private readonly db: Firestore) {}

  private async authorize(token: string, campaignId: string, edit = false) {
    if (!campaignDocumentIdSchema.safeParse(campaignId).success)
      throw new AuthError(400, "Campaña inválida.");
    return requireCampaignAccess(this.db, token, campaignId,
      edit ? ["SUPER_ADMIN"] : ["SUPER_ADMIN", "CAMPAIGN_ADMIN"]);
  }

  private async describe(registrationId: string) {
    const registration = await this.db.collection(names.campaignRegistrations).doc(registrationId).get();
    if (!registration.exists) return { registrationId, name: "Participante no disponible", congregation: "Sin congregación" };
    const data = registration.data() as CampaignRegistration;
    const profile = (await this.db.collection(names.participants).doc(data.participantId).get()).data() as Participant | undefined;
    const congregation = profile?.congregationId
      ? (await this.db.collection(names.congregations).doc(profile.congregationId).get()).data() as Congregation | undefined
      : undefined;
    return {
      registrationId,
      name: profile ? formatPersonName(profile.fullName) : "Participante no disponible",
      congregation: congregation?.name ?? "Sin congregación",
    };
  }

  async view(token: string, campaignId: string, search = "") {
    const access = await this.authorize(token, campaignId);
    const record = (await this.db.collection(names.campaignTeams).doc(campaignId).get()).data() as TeamRecord | undefined;
    const team = record ?? empty(campaignId);
    const primary = team.primaryRegistrationId ? await this.describe(team.primaryRegistrationId) : null;
    const helpers = await Promise.all(team.helperRegistrationIds.map((id) => this.describe(id)));
    const term = search.trim().toLocaleLowerCase("es");
    let candidates: Awaited<ReturnType<CampaignTeamService["describe"]>>[] = [];
    if (term.length >= 2 && term.length <= 100 && access.role === "SUPER_ADMIN") {
      const rows = await this.db.collection(names.campaignRegistrations)
        .where("campaignId", "==", campaignId).get();
      const active = rows.docs.filter((doc) => doc.data().registrationStatus === "active");
      const profiles = await Promise.all(active.map(async (doc) => {
        const profile = (await this.db.collection(names.participants).doc(doc.data().participantId).get()).data() as Participant | undefined;
        return { registrationId: doc.id, profile };
      }));
      const congregationIds = [...new Set(profiles.map(({ profile }) => profile?.congregationId).filter((id): id is string => !!id))];
      const congregationDocs = await Promise.all(congregationIds.map((id) => this.db.collection(names.congregations).doc(id).get()));
      const congregations = new Map(congregationDocs.map((doc) => [doc.id, (doc.data() as Congregation | undefined)?.name ?? "Sin congregación"]));
      candidates = profiles.filter(({ profile }) => profile?.active === true)
        .map(({ registrationId, profile }) => ({
          registrationId,
          name: formatPersonName(profile!.fullName),
          congregation: congregations.get(profile!.congregationId ?? "") ?? "Sin congregación",
          phone: profile!.phoneNormalized,
        }))
        .filter((candidate) => [candidate.name, candidate.congregation, candidate.phone].some((value) => value.toLocaleLowerCase("es").includes(term)))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .slice(0, 20)
        .map(({ registrationId, name, congregation }) => ({ registrationId, name, congregation }));
    }
    return { primary, helpers, candidates, revision: team.revision, canEdit: access.role === "SUPER_ADMIN",
      accessNotice: "ACCESO ADMINISTRATIVO PENDIENTE DE IMPLEMENTAR" };
  }

  async change(token: string, campaignId: string, input: unknown) {
    const access = await this.authorize(token, campaignId, true);
    const parsed = changeSchema.safeParse(input);
    if (!parsed.success) throw new AuthError(400, "Revisa la persona y la acción seleccionadas.");
    const { action, registrationId, expectedRevision } = parsed.data;
    if (action !== "clearPrimary" && !registrationId)
      throw new AuthError(400, "Selecciona un participante.");
    const ref = this.db.collection(names.campaignTeams).doc(campaignId);
    await this.db.runTransaction(async (tx) => {
      const campaign = await tx.get(this.db.collection(names.campaigns).doc(campaignId));
      if (!campaign.exists) throw new AuthError(404, "Campaña no encontrada.");
      const current = (await tx.get(ref)).data() as TeamRecord | undefined;
      const team = current ?? empty(campaignId);
      if (team.revision !== expectedRevision)
        throw new AuthError(409, "El equipo cambió. Actualiza la página e inténtalo nuevamente.");
      if (action === "setPrimary" || action === "addHelper") {
        const registration = await tx.get(this.db.collection(names.campaignRegistrations).doc(registrationId!));
        if (!registration.exists || registration.data()?.campaignId !== campaignId || registration.data()?.registrationStatus !== "active")
          throw new AuthError(400, "Selecciona una inscripción activa de esta campaña.");
        const profile = await tx.get(this.db.collection(names.participants).doc(registration.data()!.participantId));
        if (profile.data()?.active !== true)
          throw new AuthError(400, "El perfil seleccionado no está activo.");
      }
      if (action === "setPrimary") {
        team.primaryRegistrationId = registrationId!;
        team.helperRegistrationIds = team.helperRegistrationIds.filter((id) => id !== registrationId);
      } else if (action === "clearPrimary") {
        team.primaryRegistrationId = null;
      } else if (action === "addHelper") {
        if (team.primaryRegistrationId === registrationId || team.helperRegistrationIds.includes(registrationId!))
          throw new AuthError(409, "Esta persona ya forma parte del equipo.");
        team.helperRegistrationIds.push(registrationId!);
      } else {
        if (!team.helperRegistrationIds.includes(registrationId!))
          throw new AuthError(404, "El ayudante no pertenece al equipo.");
        team.helperRegistrationIds = team.helperRegistrationIds.filter((id) => id !== registrationId);
      }
      team.revision += 1;
      tx.set(ref, { ...team, updatedBy: access.uid, updatedAt: Timestamp.now() });
      tx.create(this.db.collection(names.auditLogs).doc(), {
        campaignId, actorId: access.uid, action: `campaign_team_${action}`,
        entityId: campaignId, metadata: { registrationId: registrationId ?? null }, createdAt: Timestamp.now(),
      });
    });
    return this.view(token, campaignId);
  }
}
