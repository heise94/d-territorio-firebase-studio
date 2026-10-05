import "server-only";
import { createHash } from "node:crypto";
import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import type {
  Campaign,
  CampaignDay,
  TimeBlock,
  Congregation,
} from "../domain/types";
import type { ParticipantDTO } from "../domain/participant";
import {
  calculateCoverage,
  type Availability,
  type CampaignRegistration,
  type CampaignSummary,
  type RegistrationView,
} from "../domain/registration";
import { campaignCollections as collections } from "../lib/paths";
import {
  campaignDocumentIdSchema,
  saveRegistrationSchema,
} from "../schemas/registration-schemas";
import { AuthError, ParticipantAuthService } from "./auth/service";

export const registrationId = (campaignId: string, participantId: string) =>
  createHash("sha256")
    .update(JSON.stringify([campaignId, participantId]))
    .digest("hex");
export const availabilityId = (registration: string, block: string) =>
  createHash("sha256")
    .update(JSON.stringify([registration, block]))
    .digest("hex");
const registrationDTO = (row?: CampaignRegistration) =>
  row
    ? {
        id: row.id,
        maxTurns: row.maxTurns,
        registrationStatus: row.registrationStatus,
      }
    : null;
const campaignDTO = (
  campaign: Campaign,
  row?: CampaignRegistration,
): CampaignSummary => ({
  id: campaign.id,
  name: campaign.name,
  description: campaign.description ?? "",
  locationName: campaign.locationName ?? "",
  locationDetails: campaign.locationDetails ?? "",
  status: campaign.status,
  registration: registrationDTO(row),
});

export class CampaignRegistrationService {
  constructor(
    private readonly db: Firestore,
    private readonly auth: ParticipantAuthService,
  ) {}
  private registrations = () =>
    this.db.collection(collections.campaignRegistrations);
  private availabilities = () => this.db.collection(collections.availabilities);
  private validId(id: string) {
    if (!campaignDocumentIdSchema.safeParse(id).success)
      throw new AuthError(400, "Campaña inválida.");
  }
  async list(token: string): Promise<CampaignSummary[]> {
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const opened = await tx.get(
          this.db
            .collection(collections.campaigns)
            .where("status", "==", "registration_open"),
        );
        const own = await tx.get(
          this.registrations().where("participantId", "==", participant.id),
        );
        const rows = new Map(
          own.docs.map((doc) => [
            doc.data().campaignId as string,
            doc.data() as CampaignRegistration,
          ]),
        );
        const campaigns = new Map(
          opened.docs.map((doc) => [
            doc.id,
            { ...doc.data(), id: doc.id } as Campaign,
          ]),
        );
        for (const id of rows.keys()) {
          if (!campaigns.has(id)) {
            const doc = await tx.get(
              this.db.collection(collections.campaigns).doc(id),
            );
            if (doc.exists && doc.data()?.status !== "draft")
              campaigns.set(id, { ...doc.data(), id: doc.id } as Campaign);
          }
        }
        return [...campaigns.values()]
          .map((campaign) => campaignDTO(campaign, rows.get(campaign.id)))
          .sort((a, b) => a.name.localeCompare(b.name, "es"));
      },
    );
  }
  private async configuration(tx: Transaction, campaignId: string) {
    const campaignDoc = await tx.get(
      this.db.collection(collections.campaigns).doc(campaignId),
    );
    if (!campaignDoc.exists)
      throw new AuthError(404, "La campaña no está disponible.");
    const campaign = { ...campaignDoc.data(), id: campaignDoc.id } as Campaign;
    const days = await tx.get(
      this.db
        .collection(collections.campaignDays)
        .where("campaignId", "==", campaignId),
    );
    const blocks = await tx.get(
      this.db
        .collection(collections.timeBlocks)
        .where("campaignId", "==", campaignId),
    );
    const associations = await tx.get(
      this.db
        .collection(collections.campaignCongregations)
        .where("campaignId", "==", campaignId),
    );
    const congregations: { id: string; name: string }[] = [];
    for (const id of new Set(
      associations.docs.map((doc) => doc.data().congregationId as string),
    )) {
      const doc = await tx.get(
        this.db.collection(collections.congregations).doc(id),
      );
      const congregation = doc.data() as Congregation | undefined;
      if (congregation?.active)
        congregations.push({ id: doc.id, name: congregation.name });
    }
    const activeDays = days.docs
      .filter((doc) => doc.data().active === true)
      .map((doc) => ({ ...doc.data(), id: doc.id }) as CampaignDay);
    const dayIds = new Set(activeDays.map((day) => day.id));
    const activeBlocks = blocks.docs
      .filter(
        (doc) =>
          doc.data().active === true && dayIds.has(doc.data().campaignDayId),
      )
      .map((doc) => ({ ...doc.data(), id: doc.id }) as TimeBlock);
    return {
      campaign,
      activeDays,
      activeBlocks,
      congregations: congregations.sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      ),
    };
  }
  async view(token: string, campaignId: string): Promise<RegistrationView> {
    this.validId(campaignId);
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const config = await this.configuration(tx, campaignId);
        const ownDoc = await tx.get(
          this.registrations().doc(registrationId(campaignId, participant.id)),
        );
        const own = ownDoc.data() as CampaignRegistration | undefined;
        if (
          config.campaign.status === "draft" ||
          (config.campaign.status !== "registration_open" && !own)
        )
          throw new AuthError(404, "La campaña no está disponible.");
        const registrations = await tx.get(
          this.registrations().where("campaignId", "==", campaignId),
        );
        const activeIds = new Set(
          registrations.docs
            .filter((doc) => doc.data().registrationStatus === "active")
            .map((doc) => doc.id),
        );
        const availability = await tx.get(
          this.availabilities().where("campaignId", "==", campaignId),
        );
        const counts = new Map<string, number>();
        const selected = new Set<string>();
        for (const doc of availability.docs) {
          const row = doc.data() as Availability;
          if (!row.available) continue;
          if (activeIds.has(row.registrationId))
            counts.set(row.timeBlockId, (counts.get(row.timeBlockId) ?? 0) + 1);
          if (own && row.registrationId === own.id)
            selected.add(row.timeBlockId);
        }
        const visibleIds = new Set(
          config.activeBlocks.map((block) => block.id),
        );
        return {
          campaign: campaignDTO(config.campaign, own),
          congregationId:
            participant.congregationId &&
            config.congregations.some(
              (row) => row.id === participant.congregationId,
            )
              ? participant.congregationId
              : null,
          congregations: config.congregations,
          unavailableSelectionCount: [...selected].filter(
            (id) => !visibleIds.has(id),
          ).length,
          days: config.activeDays
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((day) => ({
              id: day.id,
              date: day.date,
              label: day.label ?? "",
              blocks: config.activeBlocks
                .filter((block) => block.campaignDayId === day.id)
                .map((block) => ({
                  id: block.id,
                  startTime: block.startTime,
                  endTime: block.endTime,
                  label: block.label ?? "",
                  selected: selected.has(block.id),
                  coverage: calculateCoverage(
                    counts.get(block.id) ?? 0,
                    block.capacityOverride,
                    config.campaign.defaultCapacityPerBlock,
                  ),
                }))
                .sort(
                  (a, b) =>
                    Number(b.coverage.needsSupport) -
                      Number(a.coverage.needsSupport) ||
                    a.startTime.localeCompare(b.startTime),
                ),
            })),
        };
      },
    );
  }
  async save(token: string, campaignId: string, input: unknown) {
    this.validId(campaignId);
    const parsed = saveRegistrationSchema.safeParse(input);
    if (!parsed.success)
      throw new AuthError(
        400,
        "Revisa la congregación, el máximo de turnos y los horarios seleccionados.",
      );
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant: ParticipantDTO) => {
        const config = await this.configuration(tx, campaignId);
        if (config.campaign.status !== "registration_open")
          throw new AuthError(
            409,
            "Las inscripciones ya se cerraron. Tu cambio no fue guardado.",
          );
        if (
          !config.congregations.some(
            (row) => row.id === parsed.data.congregationId,
          )
        )
          throw new AuthError(
            400,
            "Selecciona una congregación activa de esta campaña.",
          );
        const visibleIds = new Set(
          config.activeBlocks.map((block) => block.id),
        );
        if (parsed.data.timeBlockIds.some((id) => !visibleIds.has(id)))
          throw new AuthError(
            409,
            "Uno de los horarios ya no está disponible. Revisa los horarios y vuelve a guardar.",
          );
        const id = registrationId(campaignId, participant.id);
        const ref = this.registrations().doc(id);
        const existing = (await tx.get(ref)).data() as
          | CampaignRegistration
          | undefined;
        if (existing && existing.registrationStatus !== "active")
          throw new AuthError(
            409,
            "Tu inscripción no está activa. Contacta a la organización.",
          );
        const current = await tx.get(
          this.availabilities().where("registrationId", "==", id),
        );
        const previous = new Map(
          current.docs.map((doc) => [
            doc.data().timeBlockId as string,
            doc.data() as Availability,
          ]),
        );
        const selected = new Set(parsed.data.timeBlockIds);
        // Inactive/deleted blocks keep their history. Only visible selections are replaced.
        const changedIds = new Set([
          ...selected,
          ...[...previous.keys()].filter((block) => visibleIds.has(block)),
        ]);
        if (changedIds.size > 450)
          throw new AuthError(
            400,
            "Demasiados horarios para guardar en una operación. Contacta a la organización.",
          );
        const now = Timestamp.now();
        const registration: CampaignRegistration = {
          id,
          campaignId,
          participantId: participant.id,
          maxTurns: parsed.data.maxTurns,
          registrationStatus: "active",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        tx.set(ref, registration);
        tx.update(
          this.db.collection(collections.participants).doc(participant.id),
          { congregationId: parsed.data.congregationId, updatedAt: now },
        );
        for (const block of changedIds) {
          const old = previous.get(block);
          const row: Availability = {
            id: availabilityId(id, block),
            campaignId,
            registrationId: id,
            timeBlockId: block,
            available: selected.has(block),
            createdAt: old?.createdAt ?? now,
            updatedAt: now,
          };
          tx.set(this.availabilities().doc(row.id), row);
        }
        return { registration: registrationDTO(registration) };
      },
    );
  }
}
