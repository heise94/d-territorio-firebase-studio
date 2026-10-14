import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  adminParticipantFiltersSchema,
  adminUpdateAvailabilitySchema,
} from "../src/modules/campaigns/schemas/admin-dashboard-schemas";
import { availabilityId } from "../src/modules/campaigns/server/registration-service";
import { CampaignAdminDashboardService } from "../src/modules/campaigns/server/admin-dashboard-service";
import { AuthError } from "../src/modules/campaigns/server/auth/service";
import type { Firestore } from "firebase-admin/firestore";

// In-memory mock for Firestore to test transactions, queries, assignment protection and audit logging
function createMockFirestore(initialData: Record<string, Map<string, Record<string, unknown>>>) {
  const store = new Map<string, Map<string, Record<string, unknown>>>();
  for (const [col, docs] of Object.entries(initialData)) {
    store.set(col, new Map(docs));
  }

  const getCollection = (colName: string) => {
    if (!store.has(colName)) store.set(colName, new Map());
    return store.get(colName)!;
  };

  class MockDocRef {
    constructor(readonly collectionName: string, readonly id: string) {}
    async get() {
      const col = getCollection(this.collectionName);
      const data = col.get(this.id);
      return {
        id: this.id,
        exists: !!data,
        data: () => (data ? { ...data } : undefined),
      };
    }
  }

  class MockQuery {
    constructor(
      readonly collectionName: string,
      readonly filters: Array<{ field: string; op: string; val: unknown }> = [],
    ) {}

    where(field: string, op: string, val: unknown) {
      return new MockQuery(this.collectionName, [...this.filters, { field, op, val }]);
    }

    async get() {
      const col = getCollection(this.collectionName);
      const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
      for (const [id, data] of col.entries()) {
        let match = true;
        for (const f of this.filters) {
          if (f.op === "==" && data[f.field] !== f.val) {
            match = false;
            break;
          }
        }
        if (match) {
          docs.push({ id, data: () => ({ ...data }) });
        }
      }
      return { docs };
    }
  }

  const mockDb = {
    collection: (name: string) => {
      let docCounter = 1;
      return {
        doc: (id?: string) => new MockDocRef(name, id ?? `auto-id-${Date.now()}-${docCounter++}`),
        where: (field: string, op: string, val: unknown) => new MockQuery(name, [{ field, op, val }]),
      };
    },
    runTransaction: async <T>(updateFn: (tx: any) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (target: MockDocRef | MockQuery) => target.get(),
        getAll: async (...refs: MockDocRef[]) => {
          return Promise.all(refs.map((r) => r.get()));
        },
        set: (ref: MockDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          writes.push(() => {
            const col = getCollection(ref.collectionName);
            const prev = col.get(ref.id) || {};
            col.set(ref.id, options?.merge ? { ...prev, ...data } : { ...data });
          });
        },
        update: (ref: MockDocRef, data: Record<string, unknown>) => {
          writes.push(() => {
            const col = getCollection(ref.collectionName);
            const prev = col.get(ref.id) || {};
            col.set(ref.id, { ...prev, ...data });
          });
        },
        create: (ref: MockDocRef, data: Record<string, unknown>) => {
          writes.push(() => {
            const col = getCollection(ref.collectionName);
            col.set(ref.id, { ...data });
          });
        },
      };

      const result = await updateFn(tx);
      // If transaction completes without throwing, commit all writes
      for (const w of writes) w();
      return result;
    },
    _getStore: () => store,
  };

  return mockDb;
}

test("1. Listado compacto: headers y estructura de tabla presentes", async () => {
  const content = await readFile("src/modules/campaigns/components/admin-dashboard-participants.tsx", "utf8");
  assert.ok(content.includes("<table"), "Debe usar una tabla para listado compacto");
  assert.ok(content.includes("Hermano"), "Columna Hermano debe estar presente");
  assert.ok(content.includes("Congregación"), "Columna Congregación debe estar presente");
  assert.ok(content.includes("Acción"), "Columna Acción debe estar presente");
  assert.ok(content.includes("Ver más"), "Acción Ver más debe estar presente");
  // Ensure large cards grid is removed
  assert.ok(!content.includes("grid gap-3 md:grid-cols-2"), "Tarjetas grandes eliminadas");
});

test("2. Filtro congregación: esquema y parseo", () => {
  const parsed = adminParticipantFiltersSchema.parse({
    congregationId: "cong-123",
  });
  assert.equal(parsed.congregationId, "cong-123");
  assert.equal(parsed.status, "active");
  assert.equal(parsed.link, "all");
});

test("3. Filtro día: esquema y parseo", () => {
  const parsed = adminParticipantFiltersSchema.parse({
    dayId: "day-sat-31",
  });
  assert.equal(parsed.dayId, "day-sat-31");
});

test("4. Filtro bloque: esquema y parseo", () => {
  const parsed = adminParticipantFiltersSchema.parse({
    blockId: "block-08-10",
  });
  assert.equal(parsed.blockId, "block-08-10");
});

test("5. Filtros combinados: congregación + día + bloque + búsqueda", () => {
  const parsed = adminParticipantFiltersSchema.parse({
    q: "Juan Pérez",
    congregationId: "cong-maquehue",
    dayId: "day-sat-31",
    blockId: "block-08-10",
  });
  assert.equal(parsed.q, "Juan Pérez");
  assert.equal(parsed.congregationId, "cong-maquehue");
  assert.equal(parsed.dayId, "day-sat-31");
  assert.equal(parsed.blockId, "block-08-10");
});

test("6. Aislamiento entre campañas", () => {
  const campaignA = "camp-alpha";
  const campaignB = "camp-beta";
  const regIdA = "reg-a-1";
  const blockId = "block-1";

  const availIdA = availabilityId(regIdA, blockId);
  const availIdB = availabilityId("reg-b-1", blockId);
  assert.notEqual(availIdA, availIdB, "IDs de disponibilidad aislados por registration");
});

test("7. Detalle correcto: uso de Sheet y secciones requeridas", async () => {
  const content = await readFile("src/modules/campaigns/components/admin-dashboard-detail.tsx", "utf8");
  assert.ok(content.includes("Sheet"), "Usa Sheet drawer lateral");
  assert.ok(content.includes("Datos personales"), "Sección Datos personales presente");
  assert.ok(content.includes("Participación"), "Sección Participación presente");
  assert.ok(content.includes("Disponibilidad"), "Sección Disponibilidad presente");
  assert.ok(content.includes("Compañero"), "Sección Compañero presente");
  assert.ok(content.includes("Máximo de turnos"), "Control Máximo de turnos presente");
});

test("8. Modificar disponibilidad agregando bloque", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const blockId = "block-10-12";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map(),
    campaignAssignments: new Map(),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  const result = await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [{ blockId, available: true }],
  });

  assert.equal(result.success, true);
  const docId = availabilityId(regId, blockId);
  const savedAvail = db._getStore().get("availabilities")?.get(docId);
  assert.ok(savedAvail);
  assert.equal(savedAvail.available, true);
  assert.equal(savedAvail.timeBlockId, blockId);
});

test("9. Modificar disponibilidad quitando bloque", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const blockId = "block-08-10";
  const docId = availabilityId(regId, blockId);

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map([
      [docId, { id: docId, campaignId, registrationId: regId, timeBlockId: blockId, available: true }],
    ]),
    campaignAssignments: new Map(),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  const result = await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [{ blockId, available: false }],
  });

  assert.equal(result.success, true);
  const savedAvail = db._getStore().get("availabilities")?.get(docId);
  assert.ok(savedAvail);
  assert.equal(savedAvail.available, false);
});

test("10. Múltiples cambios en una sola operación", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const b1 = "block-1";
  const b2 = "block-2";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map(),
    campaignAssignments: new Map(),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  const result = await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [
      { blockId: b1, available: true },
      { blockId: b2, available: false },
    ],
  });

  assert.equal(result.success, true);
  const doc1 = db._getStore().get("availabilities")?.get(availabilityId(regId, b1));
  const doc2 = db._getStore().get("availabilities")?.get(availabilityId(regId, b2));
  assert.equal(doc1?.available, true);
  assert.equal(doc2?.available, false);
});

test("11. Auditoría administrativa registrada con todos los campos", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const blockId = "block-1";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map(),
    campaignAssignments: new Map(),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-actor-42", role: "SUPER_ADMIN", campaignId });

  await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [{ blockId, available: true }],
    maxTurns: 3,
    reason: "Cambio solicitado por WhatsApp",
  });

  const auditStore = db._getStore().get("auditLogs");
  assert.ok(auditStore && auditStore.size === 1);
  const [log] = auditStore.values();
  assert.equal(log.campaignId, campaignId);
  assert.equal(log.actorId, "admin-actor-42");
  assert.equal(log.action, "admin_update_availability");
  assert.equal(log.entityId, regId);
  assert.equal((log.metadata as any).reason, "Cambio solicitado por WhatsApp");
  assert.equal((log.metadata as any).previousMaxTurns, 2);
  assert.equal((log.metadata as any).newMaxTurns, 3);
});

test("12. Modificar máximo de turnos", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 1 }],
    ]),
    availabilities: new Map(),
    campaignAssignments: new Map(),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  // Update maxTurns to null (Sin límite)
  await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [],
    maxTurns: null,
  });

  const reg = db._getStore().get("campaignRegistrations")?.get(regId);
  assert.equal(reg?.maxTurns, null);
});

test("13. Participante normal NO puede usar endpoint administrativo", async () => {
  const campaignId = "camp-alpha";
  const db = createMockFirestore({});
  const service = new CampaignAdminDashboardService(db as unknown as Firestore);

  // Authorize throws 403 when access is denied
  (service as any).authorize = async () => {
    throw new AuthError(403, "Tu cuenta no tiene autorización administrativa de Campañas.");
  };

  await assert.rejects(
    service.updateAvailability("participant-token", campaignId, "reg-1", { blockChanges: [] }),
    (err: unknown) => err instanceof AuthError && err.status === 403,
  );
});

test("14. Administrador de otra campaña NO puede modificar al participante", async () => {
  const campaignA = "camp-alpha";
  const db = createMockFirestore({});
  const service = new CampaignAdminDashboardService(db as unknown as Firestore);

  (service as any).authorize = async () => {
    throw new AuthError(404, "Campaña no encontrada.");
  };

  await assert.rejects(
    service.updateAvailability("admin-other-token", campaignA, "reg-1", { blockChanges: [] }),
    (err: unknown) => err instanceof AuthError && err.status === 404,
  );
});

test("15. Bloque con asignación protegida: rechaza quitar disponibilidad", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const blockId = "block-published";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map([
      [availabilityId(regId, blockId), { id: availabilityId(regId, blockId), campaignId, registrationId: regId, timeBlockId: blockId, available: true }],
    ]),
    campaignAssignments: new Map([
      ["assign-1", { id: "assign-1", campaignId, registrationId: regId, timeBlockId: blockId, status: "published" }],
    ]),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  // Attempting to remove availability on block-published must reject
  await assert.rejects(
    service.updateAvailability("mock-token", campaignId, regId, {
      blockChanges: [{ blockId, available: false }],
    }),
    (err: unknown) =>
      err instanceof AuthError &&
      err.status === 400 &&
      err.message.includes("Este hermano ya está asignado en este horario"),
  );

  // But adding availability on another block is allowed!
  const allowed = await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [{ blockId: "block-free", available: true }],
  });
  assert.equal(allowed.success, true);
});

test("16. Programa publicado no se altera al modificar disponibilidad", async () => {
  const campaignId = "camp-alpha";
  const regId = "reg-1";
  const publishedBlock = "block-pub";
  const freeBlock = "block-free";

  const db = createMockFirestore({
    campaignRegistrations: new Map([
      [regId, { id: regId, campaignId, participantId: "p1", maxTurns: 2 }],
    ]),
    availabilities: new Map([
      [availabilityId(regId, publishedBlock), { id: availabilityId(regId, publishedBlock), campaignId, registrationId: regId, timeBlockId: publishedBlock, available: true }],
    ]),
    campaignAssignments: new Map([
      ["assign-1", { id: "assign-1", campaignId, registrationId: regId, timeBlockId: publishedBlock, status: "published", version: 1 }],
    ]),
    auditLogs: new Map(),
  });

  const service = new CampaignAdminDashboardService(db as unknown as Firestore);
  (service as any).authorize = async () => ({ uid: "admin-uid", role: "CAMPAIGN_ADMIN", campaignId });

  await service.updateAvailability("mock-token", campaignId, regId, {
    blockChanges: [{ blockId: freeBlock, available: true }],
  });

  // Verify published assignment was never modified
  const assign = db._getStore().get("campaignAssignments")?.get("assign-1");
  assert.equal(assign?.status, "published");
  assert.equal(assign?.version, 1);
});

test("17. Estados legacy de aprobación no aparecen en UI", async () => {
  for (const file of [
    "src/modules/campaigns/components/admin-dashboard.tsx",
    "src/modules/campaigns/components/admin-dashboard-participants.tsx",
    "src/modules/campaigns/components/admin-dashboard-detail.tsx",
  ]) {
    const code = await readFile(file, "utf8");
    // Ensure technical approval status words are not rendered in user-facing JSX
    assert.doesNotMatch(code, /approved|not_approved|pendiente de aprobación|no autorizado/i, `No legacy approval in ${file}`);
  }
});
