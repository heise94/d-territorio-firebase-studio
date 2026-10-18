import "server-only";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  calculateCoverage,
  registrationIsEligible,
} from "../domain/registration";
import type { PairRequest } from "../domain/pair-request";
import { normalizePairSearch } from "../domain/pair-request";
import {
  coverageState,
  orderedCoverageDays,
  type AdminOverview,
  type AdminParticipantRow,
  type AdminParticipantList,
  type AdminParticipantDetail,
  type AdminAvailability,
  type AdminPairDetail,
} from "../domain/admin-dashboard";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";
import {
  adminParticipantFiltersSchema,
  adminUpdateAvailabilitySchema,
  adminUpdateParticipantNameSchema,
} from "../schemas/admin-dashboard-schemas";
import { formatPersonName } from "../lib/presentation";
import { reserveAvailabilityPlaces } from "./availability-capacity";
import { phoneSchema } from "../schemas/participant-auth";
import { AuthError } from "./auth/service";
import { requireCampaignAccess } from "./campaign-access";
import {
  readDashboardSource,
  type DashboardSource,
} from "./admin-dashboard-source";
import { availabilityId } from "./registration-service";
import { campaignCollections } from "../lib/paths";

function availability(
  source: DashboardSource,
  blockId: string,
): AdminAvailability {
  const block = source.blocks.get(blockId);
  return {
    blockId,
    date: block ? (source.days.get(block.campaignDayId)?.date ?? null) : null,
    startTime: block?.startTime ?? null,
    endTime: block?.endTime ?? null,
    label: block?.label ?? (block ? "" : "Horario eliminado"),
    active: source.activeBlocks.has(blockId),
  };
}
function pairContext(source: DashboardSource, pair: PairRequest) {
  const a = source.registrations.get(pair.requesterRegistrationId)!,
    b = source.registrations.get(pair.recipientRegistrationId)!;
  const first = source.selections.get(a.id) ?? new Set<string>(),
    second = source.selections.get(b.id) ?? new Set<string>();
  const shared = [...first].filter(
    (id) => second.has(id) && source.activeBlocks.has(id),
  );
  return {
    shared,
    availabilityConflict: shared.length === 0,
    participationConflict:
      a.registrationStatus !== "active" ||
      b.registrationStatus !== "active" ||
      source.profiles.get(a.participantId)?.active !== true ||
      source.profiles.get(b.participantId)?.active !== true,
  };
}
function visiblePairs(source: DashboardSource) {
  return source.pairs.filter((pair) =>
    [pair.requesterRegistrationId, pair.recipientRegistrationId].every((id) => {
      const registration = source.registrations.get(id);
      return !!registration && registrationIsEligible(registration);
    }),
  );
}

function rows(source: DashboardSource): AdminParticipantRow[] {
  // Keep withdrawn/cancelled rows visible for administration and history;
  // operational counts and planning still require an active registration.
  return [...source.registrations.values()]
    .map((registration) => {
      const profile = source.profiles.get(registration.participantId);
      const ownPairs = visiblePairs(source).filter(
        (pair) =>
          pair.requesterRegistrationId === registration.id ||
          pair.recipientRegistrationId === registration.id,
      );
      const accepted = ownPairs.find((pair) => pair.status === "accepted");
      const otherId = accepted
        ? accepted.requesterRegistrationId === registration.id
          ? accepted.recipientRegistrationId
          : accepted.requesterRegistrationId
        : null;
      const other = otherId ? source.registrations.get(otherId) : null;
      const conflict = accepted ? pairContext(source, accepted) : null;
      return {
        registrationId: registration.id,
        fullName: profile?.fullName ?? "Participante no disponible",
        congregationId: profile?.congregationId ?? null,
        congregation: profile?.congregationId
          ? (source.congregations.get(profile.congregationId)?.name ??
            "Congregación no disponible")
          : "Sin congregación",
        availableBlockCount: [
          ...(source.selections.get(registration.id) ?? []),
        ].filter((id) => source.activeBlocks.has(id)).length,
        maxTurns: registration.maxTurns,
        registrationStatus: registration.registrationStatus,
        profileActive: profile?.active === true,
        accepted:
          accepted && otherId && conflict
            ? {
                requestId: accepted.id,
                otherRegistrationId: otherId,
                otherName: other
                  ? (source.profiles.get(other.participantId)?.fullName ??
                    "Participante no disponible")
                  : "Participante no disponible",
                availabilityConflict: conflict.availabilityConflict,
                participationConflict: conflict.participationConflict,
              }
            : null,
        pendingSent: ownPairs.filter(
          (pair) =>
            pair.status === "pending" &&
            pair.requesterRegistrationId === registration.id,
        ).length,
        pendingReceived: ownPairs.filter(
          (pair) =>
            pair.status === "pending" &&
            pair.recipientRegistrationId === registration.id,
        ).length,
      };
    });
}

/** Read-only application service. Every entry point authorizes before any campaign read. */
export class CampaignAdminDashboardService {
  constructor(private readonly db: Firestore) {}
  private async authorize(token: string, campaignId: string) {
    if (!campaignDocumentIdSchema.safeParse(campaignId).success)
      throw new AuthError(400, "Campaña inválida.");
    try {
      return await requireCampaignAccess(this.db, token, campaignId, [
        "SUPER_ADMIN",
        "CAMPAIGN_ADMIN",
      ]);
    } catch (error) {
      // An authenticated administrator must not be able to distinguish an
      // unknown campaign from one outside its explicit grant.
      if (
        error instanceof AuthError &&
        error.status === 403 &&
        error.message === "No tienes acceso a esta campaña."
      )
        throw new AuthError(404, "Campaña no encontrada.");
      throw error;
    }
  }
  async overview(token: string, campaignId: string): Promise<AdminOverview> {
    await this.authorize(token, campaignId);
    return this.db.runTransaction(async (tx) => {
      const source = await readDashboardSource(this.db, tx, campaignId);
      const active = new Set(
        [...source.registrations.values()]
          .filter(
            (row) =>
              row.registrationStatus === "active" &&
              registrationIsEligible(row),
          )
          .map((row) => row.id),
      );
      const counts = new Map<string, number>();
      for (const [id, selected] of source.selections)
        if (active.has(id))
          for (const blockId of selected)
            if (source.activeBlocks.has(blockId))
              counts.set(blockId, (counts.get(blockId) ?? 0) + 1);

      const congregationCounts = new Map<string, number>();
      for (const reg of source.registrations.values()) {
        if (reg.registrationStatus === "active" && registrationIsEligible(reg)) {
          const profile = source.profiles.get(reg.participantId);
          if (profile?.congregationId) {
            congregationCounts.set(
              profile.congregationId,
              (congregationCounts.get(profile.congregationId) ?? 0) + 1,
            );
          }
        }
      }

      const days = [...source.days.values()]
        .filter((day) => day.active)
        .map((day) => {
          const dayParticipants = new Set<string>();
          for (const [id, selected] of source.selections) {
            if (active.has(id)) {
              for (const blockId of selected) {
                if (source.activeBlocks.get(blockId)?.campaignDayId === day.id) {
                  dayParticipants.add(id);
                }
              }
            }
          }

          return {
            id: day.id,
            date: day.date,
            label: day.label ?? "",
            availableCount: dayParticipants.size,
            blocks: [...source.activeBlocks.values()]
              .filter((block) => block.campaignDayId === day.id)
              .map((block) => {
                const coverage = calculateCoverage(
                  counts.get(block.id) ?? 0,
                  block.capacityOverride,
                  source.campaign.defaultCapacityPerBlock,
                );
                return {
                  id: block.id,
                  dayId: day.id,
                  date: day.date,
                  startTime: block.startTime,
                  endTime: block.endTime,
                  label: block.label ?? "",
                  coverage,
                  state: coverageState(coverage),
                };
              }),
          };
        });
      const blocks = days.flatMap((day) => day.blocks);
      const accepted = visiblePairs(source).filter(
        (pair) => pair.status === "accepted",
      );
      return {
        campaign: {
          id: campaignId,
          name: source.campaign.name,
          locationName: source.campaign.locationName ?? "",
          locationDetails: source.campaign.locationDetails ?? "",
          status: source.campaign.status,
          dates: [
            ...new Set(
              [...source.days.values()]
                .filter((day) => day.active)
                .map((day) => day.date),
            ),
          ].sort(),
        },
        metrics: {
          activeRegistrations: active.size,
          needsSupportBlocks: blocks.filter(
            (block) => block.coverage.needsSupport,
          ).length,
          fullBlocks: blocks.filter((block) => block.coverage.isFull).length,
          reservePotential: blocks.reduce(
            (sum, block) => sum + (block.coverage.reservePotential ?? 0),
            0,
          ),
          pendingRequests: visiblePairs(source).filter(
            (pair) => pair.status === "pending",
          ).length,
          acceptedLinks: accepted.length,
          acceptedAvailabilityConflicts: accepted.filter(
            (pair) => pairContext(source, pair).availabilityConflict,
          ).length,
        },
        days: orderedCoverageDays(days, false),
        congregations: [...source.congregations]
          .map(([id, congregation]) => ({
            id,
            name: congregation.name,
            participantCount: congregationCounts.get(id) ?? 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
        updatedAt: new Date().toISOString(),
      };
    });
  }
  async participants(
    token: string,
    campaignId: string,
    input: unknown = {},
  ): Promise<AdminParticipantList> {
    await this.authorize(token, campaignId);
    const parsed = adminParticipantFiltersSchema.safeParse(input);
    if (!parsed.success)
      throw new AuthError(400, "Revisa los filtros de participantes.");
    const filters = parsed.data;
    const phoneQuery = /\d/.test(filters.q) && /^[+\d\s()-]+$/.test(filters.q);
    const phone = phoneQuery ? phoneSchema.safeParse(filters.q) : null;
    if (phone && !phone.success)
      throw new AuthError(
        400,
        "Para buscar por teléfono ingresa el móvil chileno completo.",
      );
    return this.db.runTransaction(async (tx) => {
      const source = await readDashboardSource(
        this.db,
        tx,
        campaignId,
        phoneQuery,
      );
      if (
        (filters.dayId && !source.days.get(filters.dayId)?.active) ||
        (filters.blockId && !source.activeBlocks.has(filters.blockId)) ||
        (filters.congregationId &&
          !source.congregations.has(filters.congregationId))
      )
        throw new AuthError(
          400,
          "El filtro ya no está disponible en esta campaña. Actualiza el panel.",
        );
      const result = rows(source)
        .filter((row) => {
          const selected =
            source.selections.get(row.registrationId) ?? new Set<string>();
          if (
            row.registrationStatus !== filters.status ||
            (filters.congregationId &&
              row.congregationId !== filters.congregationId)
          )
            return false;
          if (filters.blockId && !selected.has(filters.blockId)) return false;
          if (
            filters.dayId &&
            ![...selected].some(
              (id) =>
                source.activeBlocks.get(id)?.campaignDayId === filters.dayId,
            )
          )
            return false;
          if (phone?.success) {
            const registration = source.registrations.get(row.registrationId)!;
            if (
              source.profiles.get(registration.participantId)
                ?.phoneNormalized !== phone.data
            )
              return false;
          } else if (
            filters.q &&
            !normalizePairSearch(row.fullName).includes(
              normalizePairSearch(filters.q),
            )
          )
            return false;
          const pending = row.pendingSent + row.pendingReceived;
          return (
            filters.link === "all" ||
            (filters.link === "none" && !row.accepted && !pending) ||
            (filters.link === "pending" && pending > 0) ||
            (filters.link === "accepted" && !!row.accepted) ||
            (filters.link === "conflict" &&
              row.accepted?.availabilityConflict === true)
          );
        })
        .sort(
          (a, b) =>
            a.fullName.localeCompare(b.fullName, "es") ||
            a.registrationId.localeCompare(b.registrationId),
        );
      const pageSize = 25;
      return {
        rows: result.slice(
          (filters.page - 1) * pageSize,
          filters.page * pageSize,
        ),
        total: result.length,
        page: filters.page,
        pageSize,
        updatedAt: new Date().toISOString(),
      };
    });
  }
  async detail(
    token: string,
    campaignId: string,
    id: string,
  ): Promise<AdminParticipantDetail> {
    await this.authorize(token, campaignId);
    if (!campaignDocumentIdSchema.safeParse(id).success)
      throw new AuthError(400, "Inscripción inválida.");
    return this.db.runTransaction(async (tx) => {
      const source = await readDashboardSource(this.db, tx, campaignId);
      const row = rows(source).find((row) => row.registrationId === id);
      const registration = source.registrations.get(id);
      if (!row || !registration)
        throw new AuthError(404, "Inscripción no disponible en esta campaña.");
      const phoneDoc = await tx.getAll(
        this.db
          .collection(campaignCollections.participants)
          .doc(registration.participantId),
        { fieldMask: ["phoneNormalized"] },
      );
      const assignmentDocs = await tx.get(
        this.db
          .collection(campaignCollections.assignments)
          .where("campaignId", "==", campaignId)
          .where("registrationId", "==", id),
      );
      const publishedAssignmentBlockIds = assignmentDocs.docs
        .map((doc) => doc.data())
        .filter((a) => a.status === "published")
        .map((a) => a.timeBlockId as string);

      const pairRequests: AdminPairDetail[] = visiblePairs(source)
        .filter(
          (pair) =>
            pair.requesterRegistrationId === id ||
            pair.recipientRegistrationId === id,
        )
        .map((pair) => {
          const received = pair.recipientRegistrationId === id;
          const otherId = received
            ? pair.requesterRegistrationId
            : pair.recipientRegistrationId;
          const other = source.registrations.get(otherId)!;
          const context = pairContext(source, pair);
          return {
            id: pair.id,
            status: pair.status,
            direction: received ? "received" : "sent",
            otherRegistrationId: otherId,
            otherName:
              source.profiles.get(other.participantId)?.fullName ??
              "Participante no disponible",
            availabilityConflict: context.availabilityConflict,
            participationConflict: context.participationConflict,
            sharedBlocks: context.shared.map((blockId) =>
              availability(source, blockId),
            ),
          };
        });
      const companionByBlockId = new Map<string, string>();
      for (const pair of pairRequests) {
        if (pair.status !== "accepted") continue;
        for (const block of pair.sharedBlocks)
          companionByBlockId.set(block.blockId, pair.otherName);
      }
      return {
        ...row,
        phone: phoneDoc[0].data()?.phoneNormalized ?? null,
        createdAt: registration.createdAt
          ? (typeof (registration.createdAt as unknown as { toDate?: () => Date }).toDate === "function"
              ? (registration.createdAt as unknown as { toDate: () => Date }).toDate().toISOString()
              : String(registration.createdAt))
          : undefined,
        publishedAssignmentBlockIds,
        availability: [...(source.selections.get(id) ?? [])]
          .map((blockId) => {
            const avail = availability(source, blockId);
            return {
              ...avail,
              ...(companionByBlockId.has(blockId)
                ? { companionName: companionByBlockId.get(blockId)! }
                : {}),
              assignedPublished: publishedAssignmentBlockIds.includes(blockId),
            };
          })
          .sort(
            (a, b) =>
              (a.date ?? "").localeCompare(b.date ?? "") ||
              (a.startTime ?? "").localeCompare(b.startTime ?? ""),
          ),
        pairRequests,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async updateAvailability(
    token: string,
    campaignId: string,
    registrationId: string,
    input: unknown,
  ): Promise<{ success: true; message: string; updatedAt: string }> {
    const access = await this.authorize(token, campaignId);
    if (!campaignDocumentIdSchema.safeParse(registrationId).success)
      throw new AuthError(400, "Inscripción inválida.");
    const parsed = adminUpdateAvailabilitySchema.safeParse(input);
    if (!parsed.success)
      throw new AuthError(400, "Parámetros de actualización inválidos.");

    return this.db.runTransaction(async (tx) => {
      const regRef = this.db
        .collection(campaignCollections.campaignRegistrations)
        .doc(registrationId);
      const regDoc = await tx.get(regRef);
      if (!regDoc.exists || regDoc.data()?.campaignId !== campaignId) {
        throw new AuthError(404, "Inscripción no encontrada en esta campaña.");
      }
      const registrationData = regDoc.data()!;

      // Protection: cannot remove availability if there is an active published assignment
      if (parsed.data.blockChanges.some((c) => !c.available)) {
        const assignmentsQuery = await tx.get(
          this.db
            .collection(campaignCollections.assignments)
            .where("campaignId", "==", campaignId)
            .where("registrationId", "==", registrationId),
        );
        const publishedBlocks = new Set(
          assignmentsQuery.docs
            .map((d) => d.data())
            .filter((a) => a.status === "published")
            .map((a) => a.timeBlockId as string),
        );

        for (const change of parsed.data.blockChanges) {
          if (!change.available && publishedBlocks.has(change.blockId)) {
            throw new AuthError(
              400,
              "Este hermano ya está asignado en este horario a través de un programa publicado. No se puede quitar su disponibilidad directamente.",
            );
          }
        }
      }

      // Read current availabilities to record in audit log
      const availabilitiesQuery = await tx.get(
        this.db
          .collection(campaignCollections.availabilities)
          .where("campaignId", "==", campaignId)
          .where("registrationId", "==", registrationId),
      );
      const previousAvailabilities: Record<string, boolean> = {};
      for (const doc of availabilitiesQuery.docs) {
        const data = doc.data();
        if (data.timeBlockId) {
          previousAvailabilities[data.timeBlockId] = data.available === true;
        }
      }

      const now = Timestamp.now();

      // Apply block availability changes
      await reserveAvailabilityPlaces(tx, this.db, campaignId, parsed.data.blockChanges.filter((change) => change.available && !previousAvailabilities[change.blockId]).map((change) => change.blockId));
      for (const change of parsed.data.blockChanges) {
        const docId = availabilityId(registrationId, change.blockId);
        const docRef = this.db
          .collection(campaignCollections.availabilities)
          .doc(docId);
        tx.set(
          docRef,
          {
            id: docId,
            campaignId,
            registrationId,
            timeBlockId: change.blockId,
            available: change.available,
            updatedAt: now,
          },
          { merge: true },
        );
      }

      // Update maxTurns on registration if provided and changed
      const previousMaxTurns = registrationData.maxTurns ?? null;
      let newMaxTurns = previousMaxTurns;
      if (
        parsed.data.maxTurns !== undefined &&
        parsed.data.maxTurns !== previousMaxTurns
      ) {
        tx.update(regRef, {
          maxTurns: parsed.data.maxTurns,
          updatedAt: now,
        });
        newMaxTurns = parsed.data.maxTurns;
      }

      // Record administrative audit log
      const auditRef = this.db.collection(campaignCollections.auditLogs).doc();
      tx.create(auditRef, {
        campaignId,
        actorId: access.uid,
        action: "admin_update_availability",
        entityId: registrationId,
        metadata: {
          blockChanges: parsed.data.blockChanges,
          previousMaxTurns,
          newMaxTurns,
          reason: parsed.data.reason ?? null,
          previousAvailabilities,
        },
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Disponibilidad actualizada exitosamente.",
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async updateParticipantName(token: string, campaignId: string, registrationId: string, input: unknown) {
    const access = await this.authorize(token, campaignId);
    if (!campaignDocumentIdSchema.safeParse(registrationId).success)
      throw new AuthError(400, "Inscripción inválida.");
    const parsed = adminUpdateParticipantNameSchema.safeParse(input);
    if (!parsed.success) throw new AuthError(400, "Nombre inválido.");
    const fullName = parsed.data.fullName.trim().replace(/\s+/g, " ");
    return this.db.runTransaction(async (tx) => {
      const registrationRef = this.db.collection(campaignCollections.campaignRegistrations).doc(registrationId);
      const registration = await tx.get(registrationRef);
      if (!registration.exists || registration.data()?.campaignId !== campaignId)
        throw new AuthError(404, "Inscripción no encontrada en esta campaña.");
      const profileRef = this.db.collection(campaignCollections.participants).doc(registration.data()!.participantId);
      const profile = await tx.get(profileRef);
      if (!profile.exists) throw new AuthError(404, "Cuenta del participante no disponible.");
      tx.update(profileRef, { fullName, preserveNameCase: true, updatedAt: Timestamp.now() });
      tx.create(this.db.collection(campaignCollections.auditLogs).doc(), {
        campaignId,
        actorId: access.uid,
        action: "admin_update_participant_name",
        entityId: registrationId,
        metadata: { field: "fullName" },
        createdAt: Timestamp.now(),
      });
      return { success: true as const, fullName };
    });
  }
}
