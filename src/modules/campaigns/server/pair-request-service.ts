import "server-only";
import { createHash } from "node:crypto";
import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import type { Participant, ParticipantDTO } from "../domain/participant";
import type {
  CampaignRegistration,
  Availability,
} from "../domain/registration";
import type { Campaign, CampaignDay, TimeBlock } from "../domain/types";
import {
  normalizePairSearch,
  type PairRequest,
  type PairCandidate,
  type PairRequestDTO,
  type PairRequestView,
  type PairInboxGroup,
  type SharedBlock,
} from "../domain/pair-request";
import { campaignCollections as collections } from "../lib/paths";
import {
  pairMutationSchema,
  pairSearchSchema,
} from "../schemas/pair-request-schemas";
import { campaignDocumentIdSchema } from "../schemas/registration-schemas";
import { AuthError, ParticipantAuthService } from "./auth/service";
import { registrationId } from "./registration-service";

/** Internal sentinels, not a second PairRequest model or a participant-facing collection. */
export const pairLockCollection = "campaignPairRequestLocks";
export const pairLimits = { search: 60, create: 20, respond: 60 } as const;
const key = (parts: string[]) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
export const pairRelationKey = (campaignId: string, a: string, b: string) =>
  key(["relation", campaignId, ...[a, b].sort()]);
const acceptedKey = (campaignId: string, registration: string) =>
  key(["accepted", campaignId, registration]);

export class PairRequestService {
  constructor(
    private readonly db: Firestore,
    private readonly auth: ParticipantAuthService,
  ) {}
  private requests = () => this.db.collection(collections.pairRequests);
  private locks = () => this.db.collection(pairLockCollection);
  private registrations = () =>
    this.db.collection(collections.campaignRegistrations);
  private async context(
    tx: Transaction,
    participant: ParticipantDTO,
    campaignId: string,
    mutate = false,
  ) {
    if (!campaignDocumentIdSchema.safeParse(campaignId).success)
      throw new AuthError(400, "Campaña inválida.");
    const campaign = (
      await tx.get(this.db.collection(collections.campaigns).doc(campaignId))
    ).data() as Campaign | undefined;
    const ownId = registrationId(campaignId, participant.id);
    const registration = (
      await tx.get(this.registrations().doc(ownId))
    ).data() as CampaignRegistration | undefined;
    if (
      !campaign ||
      campaign.status === "draft" ||
      !registration ||
      registration.campaignId !== campaignId ||
      registration.participantId !== participant.id
    )
      throw new AuthError(
        404,
        "Inscríbete en esta campaña para participar con otro hermano.",
      );
    if (mutate && campaign.status !== "registration_open")
      throw new AuthError(
        409,
        "Las inscripciones ya se cerraron. Tu cambio no fue guardado.",
      );
    if (mutate && registration.registrationStatus !== "active")
      throw new AuthError(
        409,
        "Tu inscripción no está activa. Contacta a la organización.",
      );
    return { campaign, ownId, registration };
  }
  private async limit(token: string, action: keyof typeof pairLimits) {
    const current = await this.auth.current(token);
    if (!current)
      throw new AuthError(401, "Tu sesión venció. Ingresa nuevamente.");
    await this.auth.limit(
      `pair-${action}`,
      current.participant.id,
      pairLimits[action],
    );
  }
  private async person(
    tx: Transaction,
    registration: CampaignRegistration | undefined,
  ): Promise<{ fullName: string; congregation: string; active: boolean }> {
    const participant = registration
      ? ((
          await tx.get(
            this.db
              .collection(collections.participants)
              .doc(registration.participantId),
          )
        ).data() as Participant | undefined)
      : undefined;
    const congregation = participant?.congregationId
      ? (
          await tx.get(
            this.db
              .collection(collections.congregations)
              .doc(participant.congregationId),
          )
        ).data()?.name
      : "";
    return {
      fullName: participant?.fullName ?? "Participante no disponible",
      congregation: congregation ?? "",
      active: participant?.active === true,
    };
  }
  async search(
    token: string,
    campaignId: string,
    query: unknown,
  ): Promise<PairCandidate[]> {
    const parsed = pairSearchSchema.safeParse(query);
    if (!parsed.success)
      throw new AuthError(
        400,
        "Escribe al menos dos caracteres del nombre (máximo 80).",
      );
    await this.limit(token, "search");
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const { ownId } = await this.context(tx, participant, campaignId, true);
        const rows = await tx.get(
          this.registrations().where("campaignId", "==", campaignId),
        );
        const candidates: PairCandidate[] = [];
        const term = normalizePairSearch(parsed.data);
        for (const doc of rows.docs) {
          const registration = doc.data() as CampaignRegistration;
          if (doc.id === ownId || registration.registrationStatus !== "active")
            continue;
          const person = await this.person(tx, registration);
          if (
            person.active &&
            normalizePairSearch(person.fullName).includes(term)
          )
            candidates.push({
              registrationId: doc.id,
              fullName: person.fullName,
              congregation: person.congregation,
            });
        }
        return candidates
          .sort(
            (a, b) =>
              a.fullName.localeCompare(b.fullName, "es") ||
              a.registrationId.localeCompare(b.registrationId),
          )
          .slice(0, 10);
      },
    );
  }
  private async shared(
    tx: Transaction,
    campaignId: string,
    a: string,
    b: string,
  ): Promise<SharedBlock[]> {
    const availabilityA = await tx.get(
      this.db
        .collection(collections.availabilities)
        .where("registrationId", "==", a),
    );
    const availabilityB = await tx.get(
      this.db
        .collection(collections.availabilities)
        .where("registrationId", "==", b),
    );
    const selected = (rows: typeof availabilityA) =>
      new Set(
        rows.docs
          .map((doc) => doc.data() as Availability)
          .filter((row) => row.available && row.campaignId === campaignId)
          .map((row) => row.timeBlockId),
      );
    const first = selected(availabilityA),
      second = selected(availabilityB);
    const days = await tx.get(
      this.db
        .collection(collections.campaignDays)
        .where("campaignId", "==", campaignId),
    );
    const activeDays = new Map(
      days.docs
        .filter((doc) => doc.data().active === true)
        .map((doc) => [doc.id, doc.data() as CampaignDay]),
    );
    const blocks = await tx.get(
      this.db
        .collection(collections.timeBlocks)
        .where("campaignId", "==", campaignId),
    );
    return blocks.docs
      .filter(
        (doc) =>
          doc.data().active === true &&
          activeDays.has(doc.data().campaignDayId) &&
          first.has(doc.id) &&
          second.has(doc.id),
      )
      .map((doc) => {
        const block = doc.data() as TimeBlock;
        return {
          id: doc.id,
          date: activeDays.get(block.campaignDayId)!.date,
          startTime: block.startTime,
          endTime: block.endTime,
        };
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime),
      );
  }
  async view(token: string, campaignId: string): Promise<PairRequestView> {
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const { campaign, ownId, registration } = await this.context(
          tx,
          participant,
          campaignId,
        );
        const rows = await tx.get(
          this.requests().where("campaignId", "==", campaignId),
        );
        const requests: PairRequestDTO[] = [];
        for (const doc of rows.docs) {
          const request = doc.data() as PairRequest;
          const received = request.recipientRegistrationId === ownId;
          if (!received && request.requesterRegistrationId !== ownId) continue;
          const otherId = received
            ? request.requesterRegistrationId
            : request.recipientRegistrationId;
          const otherRegistration = (
            await tx.get(this.registrations().doc(otherId))
          ).data() as CampaignRegistration | undefined;
          const validOther =
            otherRegistration?.campaignId === campaignId
              ? otherRegistration
              : undefined;
          const person = await this.person(tx, validOther);
          const sharedBlocks = validOther
            ? await this.shared(tx, campaignId, ownId, otherId)
            : [];
          requests.push({
            id: doc.id,
            status: request.status,
            direction: received ? "received" : "sent",
            other: {
              fullName: person.fullName,
              congregation: person.congregation,
            },
            createdAt: request.createdAt.toDate().toISOString(),
            respondedAt: request.respondedAt?.toDate().toISOString() ?? null,
            sharedBlocks,
            availabilityConflict: sharedBlocks.length === 0,
            participationConflict:
              registration.registrationStatus !== "active" ||
              validOther?.registrationStatus !== "active" ||
              !person.active,
          });
        }
        return {
          campaign: {
            id: campaignId,
            name: campaign.name,
            status: campaign.status,
          },
          editable:
            campaign.status === "registration_open" &&
            registration.registrationStatus === "active",
          requests: requests.sort(
            (a, b) =>
              Number(b.status === "pending" && b.direction === "received") -
                Number(a.status === "pending" && a.direction === "received") ||
              b.createdAt.localeCompare(a.createdAt),
          ),
        };
      },
    );
  }
  async inbox(token: string): Promise<PairInboxGroup[]> {
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const registrations = await tx.get(
          this.registrations().where("participantId", "==", participant.id),
        );
        const groups: PairInboxGroup[] = [];
        for (const registration of registrations.docs) {
          const campaignId = registration.data().campaignId as string;
          const campaign = (
            await tx.get(
              this.db.collection(collections.campaigns).doc(campaignId),
            )
          ).data() as Campaign | undefined;
          if (!campaign || campaign.status === "draft") continue;
          const rows = await tx.get(
            this.requests().where(
              "recipientRegistrationId",
              "==",
              registration.id,
            ),
          );
          const pending = rows.docs.filter(
            (doc) =>
              doc.data().campaignId === campaignId &&
              doc.data().status === "pending",
          );
          if (!pending.length) continue;
          const names: string[] = [];
          for (const doc of pending.slice(0, 2)) {
            const sender = (
              await tx.get(
                this.registrations().doc(doc.data().requesterRegistrationId),
              )
            ).data() as CampaignRegistration | undefined;
            names.push(
              (
                await this.person(
                  tx,
                  sender?.campaignId === campaignId ? sender : undefined,
                )
              ).fullName,
            );
          }
          groups.push({
            campaignId,
            campaignName: campaign.name,
            count: pending.length,
            senderNames: names,
          });
        }
        return groups.sort((a, b) =>
          a.campaignName.localeCompare(b.campaignName, "es"),
        );
      },
    );
  }
  async mutate(token: string, campaignId: string, input: unknown) {
    const parsed = pairMutationSchema.safeParse(input);
    if (!parsed.success) throw new AuthError(400, "Solicitud inválida.");
    const data = parsed.data;
    await this.limit(token, data.action === "create" ? "create" : "respond");
    return this.auth.withParticipantTransaction(
      token,
      async (tx, participant) => {
        const { ownId } = await this.context(tx, participant, campaignId, true);
        const now = Timestamp.now();
        let request: PairRequest;
        let ref;
        if (data.action === "create") {
          if (data.recipientRegistrationId === ownId)
            throw new AuthError(400, "No puedes enviarte una solicitud.");
          const recipient = (
            await tx.get(this.registrations().doc(data.recipientRegistrationId))
          ).data() as CampaignRegistration | undefined;
          if (
            !recipient ||
            recipient.campaignId !== campaignId ||
            recipient.registrationStatus !== "active" ||
            recipient.participantId === participant.id ||
            !(await this.person(tx, recipient)).active
          )
            throw new AuthError(
              400,
              "La persona debe tener una inscripción activa en esta campaña.",
            );
          const relationRef = this.locks().doc(
            pairRelationKey(campaignId, ownId, data.recipientRegistrationId),
          );
          const relation = (await tx.get(relationRef)).data();
          if (relation) {
            const previous = (
              await tx.get(this.requests().doc(relation.requestId))
            ).data() as PairRequest | undefined;
            if (
              previous?.status === "pending" ||
              previous?.status === "accepted"
            )
              throw new AuthError(
                409,
                "Ya existe una solicitud pendiente o aceptada entre ustedes.",
              );
          }
          const ownLock = await tx.get(
            this.locks().doc(acceptedKey(campaignId, ownId)),
          );
          const otherLock = await tx.get(
            this.locks().doc(
              acceptedKey(campaignId, data.recipientRegistrationId),
            ),
          );
          if (ownLock.exists || otherLock.exists)
            throw new AuthError(
              409,
              "Uno de ustedes ya tiene un vínculo aceptado en esta campaña.",
            );
          ref = this.requests().doc();
          request = {
            id: ref.id,
            campaignId,
            requesterRegistrationId: ownId,
            recipientRegistrationId: data.recipientRegistrationId,
            status: "pending",
            createdAt: now,
            updatedAt: now,
          };
          tx.create(ref, request);
          tx.set(relationRef, {
            campaignId,
            requestId: ref.id,
            updatedAt: now,
          });
        } else {
          ref = this.requests().doc(data.requestId);
          const stored = (await tx.get(ref)).data() as PairRequest | undefined;
          if (
            !stored ||
            stored.campaignId !== campaignId ||
            (stored.requesterRegistrationId !== ownId &&
              stored.recipientRegistrationId !== ownId)
          )
            throw new AuthError(404, "Solicitud no disponible.");
          const allowed =
            data.action === "cancel"
              ? stored.requesterRegistrationId === ownId
              : stored.recipientRegistrationId === ownId;
          if (!allowed)
            throw new AuthError(
              403,
              "No puedes realizar esta acción sobre la solicitud.",
            );
          if (stored.status !== "pending")
            throw new AuthError(
              409,
              "La solicitud ya fue respondida o cancelada. Recarga para ver su estado.",
            );
          if (data.action === "accept") {
            const requester = (
              await tx.get(
                this.registrations().doc(stored.requesterRegistrationId),
              )
            ).data() as CampaignRegistration | undefined;
            const recipient = (
              await tx.get(
                this.registrations().doc(stored.recipientRegistrationId),
              )
            ).data() as CampaignRegistration | undefined;
            if (
              !requester ||
              !recipient ||
              requester.campaignId !== campaignId ||
              recipient.campaignId !== campaignId ||
              requester.registrationStatus !== "active" ||
              recipient.registrationStatus !== "active" ||
              !(await this.person(tx, requester)).active ||
              !(await this.person(tx, recipient)).active
            )
              throw new AuthError(
                409,
                "Ambas personas deben mantener su inscripción y perfil activos.",
              );
            const locks = [
              stored.requesterRegistrationId,
              stored.recipientRegistrationId,
            ]
              .sort()
              .map((id) => this.locks().doc(acceptedKey(campaignId, id)));
            const first = await tx.get(locks[0]),
              second = await tx.get(locks[1]);
            if (first.exists || second.exists)
              throw new AuthError(
                409,
                "Uno de ustedes ya tiene otro vínculo aceptado en esta campaña.",
              );
            for (const lock of locks)
              tx.create(lock, {
                campaignId,
                requestId: stored.id,
                createdAt: now,
              });
          }
          request = {
            ...stored,
            status:
              data.action === "accept"
                ? "accepted"
                : data.action === "reject"
                  ? "rejected"
                  : "cancelled",
            respondedAt: now,
            updatedAt: now,
          };
          tx.update(ref, {
            status: request.status,
            respondedAt: now,
            updatedAt: now,
          });
        }
        tx.create(this.db.collection(collections.auditLogs).doc(), {
          event: `pair_request_${data.action === "create" ? "created" : request.status}`,
          actorId: participant.id,
          campaignId,
          entityId: request.id,
          createdAt: now,
        });
        return { id: request.id, status: request.status };
      },
    );
  }
}
