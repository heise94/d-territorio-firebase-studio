import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { participantCoverageState } from "../../src/modules/campaigns/domain/registration";

test("cobertura participante usa estados cualitativos", () => {
  assert.equal(participantCoverageState(10, 10), "covered");
  assert.equal(participantCoverageState(12, 10), "covered");
  assert.equal(participantCoverageState(9, 10), "last_slots");
  assert.equal(participantCoverageState(8, 10), "last_slots");
  assert.equal(participantCoverageState(7, 10), "last_slots");
  assert.equal(participantCoverageState(6, 10), "normal");
  assert.equal(participantCoverageState(2, 10), "normal");
  assert.equal(participantCoverageState(1, 10), "needs_support");
  assert.equal(participantCoverageState(0, 10), "needs_support");
  assert.equal(participantCoverageState(0), "normal");
});

test("la UI participante no renderiza cifras de cobertura", async () => {
  const source = await readFile("src/modules/campaigns/components/availability-form.tsx", "utf8");
  assert.doesNotMatch(source, /availableCount|remainingCapacity|capacity|Necesarios|Faltan/);
  assert.match(source, /Cupos cubiertos/);
  assert.match(source, /Últimos cupos/);
  assert.match(source, /Falta apoyo/);
});
