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
test("Búsqueda: acentos/case, mínimo dos caracteres normalizados y máximo 80", () => {
  assert.equal(normalizePairSearch("  JOSÉ Pérez "), "jose perez");
  for (const query of ["", " ", "a", "a\u0301", "x".repeat(81)])
    assert.equal(pairSearchSchema.safeParse(query).success, false);
  assert.equal(pairSearchSchema.safeParse("José").success, true);
});
test("Mutaciones strict: sin identidad de emisor, campos extra ni acciones futuras", () => {
  const create = { action: "create", recipientRegistrationId: "opaque" };
  assert.equal(pairMutationSchema.safeParse(create).success, true);
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
});
test("Presupuestos individuales, sin límite global de PairRequest", () => {
  assert.deepEqual(pairLimits, { search: 60, create: 20, respond: 60 });
});
