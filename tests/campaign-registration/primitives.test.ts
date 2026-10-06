import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCoverage } from "../../src/modules/campaigns/domain/registration";
import {
  maxTurnsSchema,
  saveRegistrationSchema,
} from "../../src/modules/campaigns/schemas/registration-schemas";
import {
  registrationId,
  availabilityId,
} from "../../src/modules/campaigns/server/registration-service";

test("MaxTurns: 1/2/3/null y rechazo de números/textos arbitrarios", () => {
  for (const value of [1, 2, 3, null])
    assert.ok(maxTurnsSchema.safeParse(value).success);
  for (const value of [0, -1, 4, 1.5, "2", "sin limite", undefined, false])
    assert.ok(!maxTurnsSchema.safeParse(value).success);
});
test("Schemas: no IDs de identidad/inscripción inyectados ni bloques duplicados", () => {
  const input = {
    congregationId: "test-congregation",
    maxTurns: null,
    timeBlockIds: ["a", "b"],
  };
  assert.ok(saveRegistrationSchema.safeParse(input).success);
  assert.ok(
    !saveRegistrationSchema.safeParse({ ...input, participantId: "another" })
      .success,
  );
  assert.ok(
    !saveRegistrationSchema.safeParse({ ...input, registrationId: "another" })
      .success,
  );
  assert.ok(
    !saveRegistrationSchema.safeParse({ ...input, timeBlockIds: ["a", "a"] })
      .success,
  );
  assert.ok(
    !saveRegistrationSchema.safeParse({
      ...input,
      congregationId: "../../another",
    }).success,
  );
});
test("Cobertura: override, fallback, capacidad ausente, cero, completo y exceso", () => {
  assert.equal(calculateCoverage(2, 4, 16).capacity, 4);
  assert.equal(calculateCoverage(2, undefined, 16).capacity, 16);
  assert.deepEqual(calculateCoverage(2), {
    availableCount: 2,
    capacity: null,
    remainingCapacity: null,
    reservePotential: null,
    isFull: false,
    needsSupport: false,
  });
  assert.equal(calculateCoverage(2, 0, 16).capacity, 0);
  assert.ok(calculateCoverage(2, undefined, 16).needsSupport);
  assert.ok(!calculateCoverage(9, undefined, 16).needsSupport);
  assert.equal(calculateCoverage(15, 16).remainingCapacity, 1);
  assert.ok(calculateCoverage(16, 16).isFull);
  assert.equal(calculateCoverage(19, 16).reservePotential, 3);
  assert.equal(calculateCoverage(19, 16).remainingCapacity, 0);
});
test("IDs lógicos estables, sin ambigüedad al concatenar ni usar teléfono", () => {
  assert.equal(
    registrationId("campaign", "opaque"),
    registrationId("campaign", "opaque"),
  );
  assert.notEqual(registrationId("ab", "c"), registrationId("a", "bc"));
  assert.notEqual(availabilityId("ab", "c"), availabilityId("a", "bc"));
});
