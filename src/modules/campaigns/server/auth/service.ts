import "server-only";
import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import type {
  DeviceSession,
  Participant,
  ParticipantDTO,
} from "../../domain/participant";
import { participantDTO } from "../../domain/participant";
import { campaignCollections } from "../../lib/paths";
import {
  changePinSchema,
  loginSchema,
  registrationSchema,
  resetPinSchema,
} from "../../schemas/participant-auth";
import {
  hashPin,
  missingParticipantHash,
  newSessionToken,
  privateKey,
  SESSION_SECONDS,
  tokenHash,
  verifyPin,
} from "./crypto";

export const authCollections = {
  phoneIndex: "campaignParticipantPhones",
  limits: "campaignAuthLimits",
} as const;

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const loginFailure = () =>
  new AuthError(401, "No pudimos iniciar sesión con esos datos.");
const registrationFailure = () =>
  new AuthError(
    400,
    "No pudimos crear el perfil. Revisa tus datos o contacta a la organización.",
  );

/** All writes use server credentials. A caller never selects the identity of a session. */
export class ParticipantAuthService {
  private readonly limitQueues = new Map<string, Promise<void>>();
  constructor(
    private readonly db: Firestore,
    private readonly secret: string,
    private readonly now = () => Date.now(),
  ) {
    if (secret.length < 32)
      throw new Error(
        "CAMPAIGNS_AUTH_SECRET must contain at least 32 characters",
      );
  }
  private participants = () =>
    this.db.collection(campaignCollections.participants);
  private sessions = () =>
    this.db.collection(campaignCollections.deviceSessions);
  private phoneRef(phone: string) {
    return this.db
      .collection(authCollections.phoneIndex)
      .doc(privateKey(this.secret, "phone", phone));
  }
  private audit(tx: Transaction, event: string, participantId: string) {
    tx.create(this.db.collection(campaignCollections.auditLogs).doc(), {
      event,
      participantId,
      createdAt: Timestamp.fromMillis(this.now()),
    });
  }

  /** Distributed fixed-window limiter. Raw identifiers and failed PINs are never persisted. */
  async limit(action: string, identity: string, maximum = 5) {
    const ref = this.db
      .collection(authCollections.limits)
      .doc(privateKey(this.secret, action, identity));
    // Avoid contending with this process's own requests on the shared ceiling.
    // Firestore still serializes other instances; no local counter grants access.
    const previous = this.limitQueues.get(ref.id) ?? Promise.resolve();
    const operation = previous
      .catch(() => {})
      .then(() =>
        this.db.runTransaction(async (tx) => {
          const data = (await tx.get(ref)).data();
          const now = this.now();
          const current = data && data.expiresAt.toMillis() > now;
          const count = current ? data.count : 0;
          if (count >= maximum)
            throw new AuthError(
              429,
              "Has realizado varios intentos. Intenta nuevamente más tarde.",
            );
          tx.set(ref, {
            count: count + 1,
            expiresAt: current
              ? data.expiresAt
              : Timestamp.fromMillis(now + 15 * 60_000),
          });
        }),
      );
    const queued = operation.then(
      () => {},
      () => {},
    );
    this.limitQueues.set(ref.id, queued);
    try {
      await operation;
    } finally {
      if (this.limitQueues.get(ref.id) === queued)
        this.limitQueues.delete(ref.id);
    }
  }

  private newSession(participant: Participant, token: string): DeviceSession {
    const now = this.now();
    const digest = tokenHash(token);
    return {
      id: digest,
      participantId: participant.id,
      tokenHash: digest,
      sessionVersion: participant.sessionVersion,
      createdAt: Timestamp.fromMillis(now),
      lastSeenAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + SESSION_SECONDS * 1000),
      revokedAt: null,
    };
  }
  async register(input: unknown) {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) throw registrationFailure();
    const data = parsed.data;
    await this.limit("register", data.phone);
    const pinHash = await hashPin(this.secret, data.pin);
    const ref = this.participants().doc();
    const timestamp = Timestamp.fromMillis(this.now());
    const participant: Participant = {
      id: ref.id,
      fullName: data.fullName,
      phoneNormalized: data.phone,
      pinHash,
      ...(data.congregationId ? { congregationId: data.congregationId } : {}),
      active: true,
      sessionVersion: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const token = newSessionToken();
    const session = this.newSession(participant, token);
    await this.db.runTransaction(async (tx) => {
      const index = await tx.get(this.phoneRef(data.phone));
      const congregation = data.congregationId
        ? await tx.get(
            this.db
              .collection(campaignCollections.congregations)
              .doc(data.congregationId),
          )
        : null;
      if (
        index.exists ||
        (data.congregationId && congregation?.data()?.active !== true)
      )
        throw registrationFailure();
      tx.create(this.phoneRef(data.phone), { participantId: ref.id });
      tx.create(ref, participant);
      tx.create(this.sessions().doc(session.id), session);
      this.audit(tx, "participant_registered", participant.id);
    });
    return { participant: participantDTO(participant), token };
  }
  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw loginFailure();
    await this.limit("login", parsed.data.phone);
    const index = (await this.phoneRef(parsed.data.phone).get()).data();
    const participant = index
      ? ((await this.participants().doc(index.participantId).get()).data() as
          | Participant
          | undefined)
      : undefined;
    const correct = await verifyPin(
      this.secret,
      parsed.data.pin,
      participant?.pinHash ?? (await missingParticipantHash(this.secret)),
    );
    if (!correct || !participant?.active) {
      // The rate document is also an aggregate failure counter; no per-attempt phone/PIN audit.
      await this.recordFailure(parsed.data.phone);
      throw loginFailure();
    }
    const token = newSessionToken();
    const session = this.newSession(participant, token);
    await this.db.runTransaction(async (tx) => {
      const fresh = (
        await tx.get(this.participants().doc(participant.id))
      ).data() as Participant | undefined;
      if (
        !fresh?.active ||
        fresh.pinHash !== participant.pinHash ||
        fresh.sessionVersion !== participant.sessionVersion
      )
        throw loginFailure();
      tx.create(this.sessions().doc(session.id), session);
      this.audit(tx, "participant_login", participant.id);
    });
    return { participant: participantDTO(participant), token };
  }
  private async recordFailure(phone: string) {
    const ref = this.db
      .collection(authCollections.limits)
      .doc(privateKey(this.secret, "login", phone));
    await this.db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      if (data) tx.update(ref, { failures: (data.failures ?? 0) + 1 });
    });
  }
  private async readSession(tx: Transaction, token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const ref = this.sessions().doc(tokenHash(token));
    const session = (await tx.get(ref)).data() as DeviceSession | undefined;
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.toMillis() <= this.now()
    )
      return null;
    const participant = (
      await tx.get(this.participants().doc(session.participantId))
    ).data() as Participant | undefined;
    if (
      !participant?.active ||
      participant.sessionVersion !== session.sessionVersion
    )
      return null;
    return { ref, session, participant };
  }
  async current(token: string, renew = false) {
    return this.db.runTransaction(async (tx) => {
      const current = await this.readSession(tx, token);
      if (!current) return null;
      const now = this.now();
      if (renew && now - current.session.lastSeenAt.toMillis() >= 60 * 60_000) {
        const expiresAt = Timestamp.fromMillis(now + SESSION_SECONDS * 1000);
        tx.update(current.ref, {
          lastSeenAt: Timestamp.fromMillis(now),
          expiresAt,
        });
        return {
          participant: participantDTO(current.participant),
          expiresAt: expiresAt.toMillis(),
        };
      }
      return {
        participant: participantDTO(current.participant),
        expiresAt: current.session.expiresAt.toMillis(),
      };
    });
  }
  /** New participant operations reuse session validation inside their own atomic transaction. */
  async withParticipantTransaction<T>(
    token: string,
    operation: (tx: Transaction, participant: ParticipantDTO) => Promise<T>,
  ) {
    return this.db.runTransaction(async (tx) => {
      const current = await this.readSession(tx, token);
      if (!current)
        throw new AuthError(401, "Tu sesión venció. Ingresa nuevamente.");
      return operation(tx, participantDTO(current.participant));
    });
  }
  async logout(token: string) {
    await this.db.runTransaction(async (tx) => {
      const current = await this.readSession(tx, token);
      if (!current) return;
      const subscriptions = await tx.get(
        this.db
          .collection(campaignCollections.pushSubscriptions)
          .where("sessionRef", "==", tokenHash(token)),
      );
      const now = Timestamp.fromMillis(this.now());
      subscriptions.docs
        .filter((d) => d.data().participantId === current.participant.id)
        .forEach((d) =>
          tx.update(d.ref, { enabled: false, disabledAt: now, updatedAt: now }),
        );
      tx.update(current.ref, { revokedAt: Timestamp.fromMillis(this.now()) });
      this.audit(tx, "session_revoked", current.participant.id);
    });
  }
  async changePin(token: string, input: unknown) {
    const parsed = changePinSchema.safeParse(input);
    if (!parsed.success)
      throw new AuthError(400, "Revisa el PIN y su confirmación.");
    const current = await this.current(token);
    if (!current) throw loginFailure();
    await this.limit("change-pin", current.participant.id);
    const original = (
      await this.participants().doc(current.participant.id).get()
    ).data() as Participant;
    if (
      !(await verifyPin(this.secret, parsed.data.currentPin, original.pinHash))
    )
      throw loginFailure();
    const pinHash = await hashPin(this.secret, parsed.data.newPin);
    await this.db.runTransaction(async (tx) => {
      const fresh = await this.readSession(tx, token);
      if (!fresh || fresh.participant.pinHash !== original.pinHash)
        throw loginFailure();
      tx.update(this.participants().doc(original.id), {
        pinHash,
        sessionVersion: fresh.participant.sessionVersion + 1,
        updatedAt: Timestamp.fromMillis(this.now()),
      });
      this.audit(tx, "participant_pin_changed", original.id);
    });
  }
  /** Only the verified organizer wrapper may call these administrative operations. */
  async resetPin(input: unknown, organizerUid: string) {
    const parsed = resetPinSchema.safeParse(input);
    if (!parsed.success) throw new AuthError(400, "Datos inválidos.");
    await this.limit("reset-pin-organizer", organizerUid, 10);
    await this.limit("reset-pin", parsed.data.participantId);
    const pinHash = await hashPin(this.secret, parsed.data.newPin);
    await this.invalidateAll(
      parsed.data.participantId,
      "participant_pin_reset",
      pinHash,
    );
  }
  async revokeAll(participantId: string) {
    await this.invalidateAll(participantId, "participant_sessions_revoked");
  }
  private async invalidateAll(
    participantId: string,
    event: string,
    pinHash?: string,
  ) {
    await this.db.runTransaction(async (tx) => {
      const ref = this.participants().doc(participantId);
      const participant = (await tx.get(ref)).data() as Participant | undefined;
      if (!participant)
        throw new AuthError(404, "No se pudo realizar la operación.");
      tx.update(ref, {
        ...(pinHash ? { pinHash } : {}),
        sessionVersion: participant.sessionVersion + 1,
        updatedAt: Timestamp.fromMillis(this.now()),
      });
      this.audit(tx, event, participantId);
    });
  }
  async congregations() {
    const docs = await this.db
      .collection(campaignCollections.congregations)
      .where("active", "==", true)
      .get();
    return docs.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name),
    }));
  }
}
