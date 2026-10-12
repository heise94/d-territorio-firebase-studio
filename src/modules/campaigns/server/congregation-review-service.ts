import "server-only";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { CampaignRegistration, RegistrationApprovalStatus } from "../domain/registration";
import type { Participant } from "../domain/participant";
import { campaignCollections } from "../lib/paths";
import { AuthError } from "./auth/service";
import { requireCampaignAccess } from "./campaign-access";

const validStatus = new Set<RegistrationApprovalStatus>(["pending", "approved", "not_approved"]);
const stateOf = (row: CampaignRegistration): RegistrationApprovalStatus => row.approvalStatus ?? "approved";

/** Congregation-private review boundary. Participant DTOs never use this service. */
export class CongregationReviewService {
  constructor(private readonly db: Firestore) {}

  async list(token: string, campaignId: string, status?: RegistrationApprovalStatus) {
    const access = await requireCampaignAccess(this.db, token, campaignId, ["CONGREGATION_RESPONSIBLE", "SUPER_ADMIN"]);
    if (access.role === "SUPER_ADMIN" && !access.congregationId)
      throw new AuthError(400, "Selecciona una congregación para revisar participantes privados.");
    const registrations = await this.db.collection(campaignCollections.campaignRegistrations)
      .where("campaignId", "==", campaignId).get();
    const rows = await Promise.all(registrations.docs.map(async (doc) => {
      const registration = { id: doc.id, ...doc.data() } as CampaignRegistration;
      const profileDoc = await this.db.collection(campaignCollections.participants).doc(registration.participantId).get();
      const profile = profileDoc.data() as Participant | undefined;
      return { registration, profile };
    }));
    return rows
      .filter(({ registration, profile }) => profile?.congregationId === access.congregationId && (!status || stateOf(registration) === status))
      .map(({ registration, profile }) => ({
        registrationId: registration.id,
        fullName: profile?.fullName ?? "Participante no disponible",
        available: registration.registrationStatus === "active",
        maxTurns: registration.maxTurns,
        status: stateOf(registration),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  }

  async review(token: string, campaignId: string, registrationId: string, status: RegistrationApprovalStatus) {
    if (status === "pending" || !validStatus.has(status))
      throw new AuthError(400, "Estado de revisión inválido.");
    const access = await requireCampaignAccess(this.db, token, campaignId, ["CONGREGATION_RESPONSIBLE"]);
    return this.db.runTransaction(async (tx) => {
      const ref = this.db.collection(campaignCollections.campaignRegistrations).doc(registrationId);
      const registrationDoc = await tx.get(ref);
      if (!registrationDoc.exists) throw new AuthError(404, "Inscripción no encontrada.");
      const registration = { id: registrationDoc.id, ...registrationDoc.data() } as CampaignRegistration;
      if (registration.campaignId !== campaignId) throw new AuthError(404, "Inscripción no encontrada.");
      const participant = await tx.get(this.db.collection(campaignCollections.participants).doc(registration.participantId));
      if (participant.data()?.congregationId !== access.congregationId)
        throw new AuthError(403, "Solo puedes revisar participantes de tu congregación.");
      tx.update(ref, { approvalStatus: status, updatedAt: Timestamp.now() });
      tx.create(this.db.collection(campaignCollections.auditLogs).doc(), {
        campaignId, actorId: access.uid, action: "registration_reviewed", entityId: registrationId,
        metadata: { status, congregationId: access.congregationId }, createdAt: Timestamp.now(),
      });
      // Deliberately no Notification, push, or participant-facing state change.
      return { registrationId, status };
    });
  }
}
