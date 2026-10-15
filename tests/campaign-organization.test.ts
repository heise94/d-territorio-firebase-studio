import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { CampaignOrganizationService } from "../src/modules/campaigns/server/organization-service";
import { AuthError, type ParticipantAuthService } from "../src/modules/campaigns/server/auth/service";
import { availabilityId } from "../src/modules/campaigns/server/registration-service";

type Data = Record<string, unknown>;
function firestoreFixture(seed: Record<string, Record<string, Data>>) {
  const store = new Map(Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs))]));
  const bucket = (name: string) => { if (!store.has(name)) store.set(name, new Map()); return store.get(name)!; };
  class Ref {
    constructor(readonly collectionName: string, readonly id: string) {}
    async get() { const value = bucket(this.collectionName).get(this.id); return { id: this.id, exists: !!value, data: () => value && { ...value } }; }
  }
  class Query {
    constructor(readonly collectionName: string, readonly conditions: Array<[string, unknown]> = []) {}
    where(field: string, _operator: string, value: unknown) { return new Query(this.collectionName, [...this.conditions, [field, value]]); }
    async get() { return { docs: [...bucket(this.collectionName)].filter(([, row]) => this.conditions.every(([field, value]) => row[field] === value)).map(([id, row]) => ({ id, data: () => ({ ...row }) })) }; }
  }
  let sequence = 0;
  const db = {
    collection(name: string) { return { doc: (id?: string) => new Ref(name, id ?? `auto-${++sequence}`), where: (field: string, operator: string, value: unknown) => new Query(name, [[field, value]]) }; },
    async runTransaction<T>(work: (tx: any) => Promise<T>) {
      const writes: Array<() => void> = [];
      const tx = {
        get: (target: Ref | Query) => target.get(),
        getAll: (...refs: Ref[]) => Promise.all(refs.map((ref) => ref.get())),
        create: (ref: Ref, value: Data) => writes.push(() => bucket(ref.collectionName).set(ref.id, { ...value })),
        set: (ref: Ref, value: Data, options?: { merge?: boolean }) => writes.push(() => bucket(ref.collectionName).set(ref.id, options?.merge ? { ...(bucket(ref.collectionName).get(ref.id) ?? {}), ...value } : { ...value })),
        update: (ref: Ref, value: Data) => writes.push(() => bucket(ref.collectionName).set(ref.id, { ...(bucket(ref.collectionName).get(ref.id) ?? {}), ...value })),
      };
      const result = await work(tx); writes.forEach((write) => write()); return result;
    },
  };
  return { db, store };
}

const base = {
  campaigns: { a: { name: "Campaña A", status: "registration_open" }, b: { name: "Campaña B", status: "registration_open" } },
  campaignRegistrations: {
    adminA: { campaignId: "a", participantId: "organizer", registrationStatus: "active", maxTurns: null },
    memberA: { campaignId: "a", participantId: "member", registrationStatus: "active", maxTurns: 2 },
    outsiderA: { campaignId: "a", participantId: "outsider", registrationStatus: "active", maxTurns: null },
    memberB: { campaignId: "b", participantId: "memberB", registrationStatus: "active", maxTurns: null },
  },
  campaignTeams: { a: { campaignId: "a", primaryRegistrationId: "adminA", helperRegistrationIds: [] } },
  participants: {
    organizer: { fullName: "Organizador", phoneNormalized: "+56911111111", active: true, congregationId: "congA" },
    member: { fullName: "Hermana Disponible", phoneNormalized: "+56922222222", active: true, congregationId: "congA" },
    outsider: { fullName: "Participante", phoneNormalized: "+56933333333", active: true, congregationId: "congA" },
    memberB: { fullName: "Otra campaña", phoneNormalized: "+56944444444", active: true, congregationId: "congB" },
  },
  congregations: { congA: { name: "Maquehue", active: true }, congB: { name: "Otra", active: true } },
  campaignDays: { dayA: { campaignId: "a", date: "2026-11-01", active: true, label: "Domingo" } },
  timeBlocks: { blockA: { campaignId: "a", campaignDayId: "dayA", active: true, startTime: "10:00", endTime: "12:00", label: "Mañana" } },
  availabilities: { avA: { campaignId: "a", registrationId: "memberA", timeBlockId: "blockA", available: true } },
  points: { pointA: { campaignId: "a", name: "Entrada", active: true, minParticipants: 2, maxParticipants: 2 } },
  blockPoints: { bpA: { campaignId: "a", timeBlockId: "blockA", pointId: "pointA", active: true } },
  pairRequests: {}, campaignAssignments: {}, auditLogs: {}, campaignNotifications: {}, pushSubscriptions: {},
};

function serviceFor(participantId = "organizer", overrides: Record<string, unknown> = {}) {
  const fixture = firestoreFixture(structuredClone(base));
  const auth = {
    withParticipantTransaction: async <T>(_token: string, work: (tx: any, participant: { id: string }) => Promise<T>) => fixture.db.runTransaction((tx: any) => work(tx, { id: participantId })),
    findByPhone: async () => null,
    createForOrganizer: async () => { throw new Error("not used in these access tests"); },
    ...overrides,
  };
  return { service: new CampaignOrganizationService(fixture.db as unknown as Firestore, auth as unknown as ParticipantAuthService), fixture };
}

test("equipo de campaña autorizado obtiene inicio y cobertura calculada desde puntos activos", async () => {
  const { service } = serviceFor();
  const overview = await service.overview("token", "a");
  assert.equal(overview.campaign.roleLabel, "Administrador principal");
  assert.equal(overview.participantCount, 3);
  assert.equal(overview.coverage[0].blocks[0].minimum, 2);
  assert.equal(overview.coverage[0].blocks[0].available, 1);
  assert.equal(overview.coverage[0].blocks[0].state, "missing");
});

test("participante sin rol de equipo no obtiene funciones de Organización", async () => {
  const { service } = serviceFor("outsider");
  await assert.rejects(() => service.overview("token", "a"), (error: unknown) => error instanceof AuthError && error.status === 403);
});

test("un rol de campaña A no da acceso a campaña B", async () => {
  const { service } = serviceFor();
  await assert.rejects(() => service.overview("token", "b"), (error: unknown) => error instanceof AuthError && error.status === 403);
});

test("los filtros y el detalle sólo exponen registros de la campaña solicitada", async () => {
  const { service } = serviceFor();
  const list = await service.participants("token", "a", { blockId: "blockA" });
  assert.deepEqual(list.rows.map((row) => row.fullName), ["Hermana Disponible"]);
  await assert.rejects(() => service.detail("token", "a", "memberB"), (error: unknown) => error instanceof AuthError && error.status === 404);
});

test("no se puede retirar disponibilidad de un turno publicado y no crea avisos", async () => {
  const { service, fixture } = serviceFor();
  fixture.store.get("campaignAssignments")!.set("assignment", { campaignId: "a", registrationId: "memberA", timeBlockId: "blockA", status: "published" });
  await assert.rejects(() => service.updateAvailability("token", "a", "memberA", { selectedBlockIds: [], maxTurns: 2 }), /turno publicado/);
  assert.equal(fixture.store.get("campaignNotifications")!.size, 0);
  assert.equal(fixture.store.get("pushSubscriptions")!.size, 0);
});

test("alta nueva crea inscripción y disponibilidad sin generar avisos ni push", async () => {
  const newParticipant = { id: "new-member", fullName: "Hermana Nueva", phoneNormalized: "+56955555555", active: true, congregationId: "congA" };
  const { service, fixture } = serviceFor("organizer", { createForOrganizer: async () => newParticipant });
  const result = await service.createParticipant("token", "a", { action: "create", fullName: "Hermana Nueva", phone: "55555555", pin: "1234", congregationId: "congA", maxTurns: 2, selectedBlockIds: ["blockA"] });
  assert.equal(result.kind, "created");
  assert.equal(fixture.store.get("campaignRegistrations")!.get(result.registrationId)?.participantId, "new-member");
  assert.equal(fixture.store.get("availabilities")!.get(availabilityId(result.registrationId, "blockA"))?.available, true);
  assert.equal(fixture.store.get("campaignNotifications")!.size, 0);
  assert.equal(fixture.store.get("pushSubscriptions")!.size, 0);
});

test("cuenta existente se detecta antes de crear otra y puede abrirse su ficha", async () => {
  const existing = { id: "member", fullName: "Hermana Disponible", phoneNormalized: "+56922222222", active: true, congregationId: "congA" };
  const { service } = serviceFor("organizer", { findByPhone: async () => existing });
  const result = await service.createParticipant("token", "a", { action: "create", fullName: "Otro nombre", phone: "22222222", pin: "1234", congregationId: "congA", maxTurns: null, selectedBlockIds: [] });
  assert.equal(result.kind, "already_registered");
  assert.equal(result.registrationId, "memberA");
});

test("la interfaz consume endpoints protegidos y ofrece Contact Picker sólo cuando existe", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile("src/modules/campaigns/components/organization-pwa.tsx", "utf8"));
  assert.match(source, /contacts\.select/);
  assert.match(source, /campaignFetch\(`\/api\/campanas\/organization/);
  assert.match(source, /Turno publicado/);
  assert.match(source, /Abrir ficha del hermano/);
});
