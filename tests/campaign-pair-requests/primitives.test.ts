import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePairSearch } from "../../src/modules/campaigns/domain/pair-request";
import {
  pairMutationSchema,
  pairSearchSchema,
} from "../../src/modules/campaigns/schemas/pair-request-schemas";
import {
  pairRelationKey,
  pairLimits,
} from "../../src/modules/campaigns/server/pair-request-service";
import { campaignInformationSchema } from "../../src/modules/campaigns/schemas/campaign-schemas";
import { acceptedUnit } from "../../src/modules/campaigns/server/planner-source";
test("Búsqueda: acentos/case, mínimo dos caracteres normalizados y máximo 80", () => {
  assert.equal(normalizePairSearch("  JOSÉ Pérez "), "jose perez");
  for (const query of ["", " ", "a", "a\u0301", "x".repeat(81)])
    assert.equal(pairSearchSchema.safeParse(query).success, false);
  assert.equal(pairSearchSchema.safeParse("José").success, true);
});
test("Mutaciones strict: sin identidad de emisor, campos extra ni acciones futuras", () => {
  const create = { action: "create", recipientRegistrationId: "opaque" };
  assert.equal(pairMutationSchema.safeParse(create).success, true);
  assert.equal(
    pairMutationSchema.safeParse({
      ...create,
      timeBlockId: "bloque-manana",
    }).success,
    true,
  );
  for (const field of [
    "requesterParticipantId",
    "requesterRegistrationId",
    "participantId",
    "status",
    "phone",
    "availability",
  ])
    assert.equal(
      pairMutationSchema.safeParse({ ...create, [field]: "injected" }).success,
      false,
    );
  for (const action of ["accept", "reject", "cancel"])
    assert.equal(
      pairMutationSchema.safeParse({ action, requestId: "opaque" }).success,
      true,
    );
  assert.equal(
    pairMutationSchema.safeParse({ action: "assign", requestId: "opaque" })
      .success,
    false,
  );
});
test("Sentinel de relación: simétrico, separado por campaña, tuplas sin ambigüedad", () => {
  assert.equal(
    pairRelationKey("one", "a", "b"),
    pairRelationKey("one", "b", "a"),
  );
  assert.notEqual(
    pairRelationKey("one", "a", "b"),
    pairRelationKey("two", "a", "b"),
  );
  assert.notEqual(
    pairRelationKey("one", "ab", "c"),
    pairRelationKey("one", "a", "bc"),
  );
  assert.notEqual(
    pairRelationKey("one", "a", "b", "bloque-am"),
    pairRelationKey("one", "a", "b", "bloque-pm"),
  );
});
test("Parejas accepted se aplican solo al bloque que ambas personas confirmaron", () => {
  const source = {
    pairs: [
      {
        status: "accepted",
        requesterRegistrationId: "a",
        recipientRegistrationId: "b",
        timeBlockId: "bloque-am",
      },
    ],
  } as Parameters<typeof acceptedUnit>[0];
  assert.deepEqual(acceptedUnit(source, "a", "bloque-am"), ["a", "b"]);
  assert.deepEqual(acceptedUnit(source, "a", "bloque-pm"), ["a"]);
});
test("Información de campaña: URLs HTTPS y contactos operativos estrictos", () => {
  const valid = {
    generalMapUrl: "https://maps.example.test/campana",
    pickup: { location: "Bodega", mapUrl: "https://maps.example.test/retiro" },
    contacts: [
      {
        name: "Coordinación",
        phone: "+56 9 1234 5678",
        allowCall: true,
        allowWhatsApp: true,
      },
    ],
  };
  assert.equal(campaignInformationSchema.safeParse(valid).success, true);
  assert.equal(
    campaignInformationSchema.safeParse({
      ...valid,
      generalMapUrl: "http://maps.example.test/campana",
    }).success,
    false,
  );
  assert.equal(
    campaignInformationSchema.safeParse({
      ...valid,
      contacts: [{ ...valid.contacts[0], participantId: "injected" }],
    }).success,
    false,
  );
});
test("Presupuestos individuales, sin límite global de PairRequest", () => {
  assert.deepEqual(pairLimits, { search: 60, create: 20, respond: 60 });
});
