import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { participantCoverageState } from "../../src/modules/campaigns/domain/registration";
import { calculateBlockCapacity } from "../../src/modules/campaigns/domain/point-capacity";

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
  assert.equal(participantCoverageState(16, 0), "normal");
});

test("cobertura participante deriva los umbrales desde ocho puntos activos", async () => {
  const campaignId = "campaign-a";
  const blockId = "block-a";
  const points = Array.from({ length: 8 }, (_, index) => ({
    id: `point-${index}`,
    campaignId,
    active: true,
    minParticipants: 2,
    maxParticipants: 2,
    name: `Punto ${index}`,
    sortOrder: index,
  }));
  const blockPoints = points.map((point) => ({
    id: `association-${point.id}`,
    campaignId,
    pointId: point.id,
    timeBlockId: blockId,
    active: true,
  }));
  const capacity = calculateBlockCapacity(campaignId, blockId, points, blockPoints);
  assert.equal(capacity.minParticipants, 16);
  assert.equal(participantCoverageState(16, capacity.minParticipants), "covered");
  assert.equal(participantCoverageState(17, capacity.minParticipants), "covered");
  assert.equal(participantCoverageState(15, capacity.minParticipants), "last_slots");
  assert.equal(participantCoverageState(14, capacity.minParticipants), "last_slots");
  assert.equal(participantCoverageState(13, capacity.minParticipants), "last_slots");
  assert.equal(participantCoverageState(12, capacity.minParticipants), "normal");
  assert.equal(participantCoverageState(8, capacity.minParticipants), "normal");
  assert.equal(participantCoverageState(7, capacity.minParticipants), "needs_support");
  assert.equal(participantCoverageState(6, capacity.minParticipants), "needs_support");
  const registrationService = await readFile("src/modules/campaigns/server/registration-service.ts", "utf8");
  assert.match(registrationService, /calculateBlockCapacity\(/);
  assert.doesNotMatch(registrationService, /block\.capacityOverride/);
  assert.doesNotMatch(registrationService, /defaultCapacityPerBlock/);
});

test("la UI participante no renderiza cifras de cobertura", async () => {
  const source = await readFile("src/modules/campaigns/components/availability-form.tsx", "utf8");
  assert.doesNotMatch(source, /availableCount|remainingCapacity|capacity|Necesarios|Faltan/);
  assert.match(source, /Cupos cubiertos/);
  assert.match(source, /Últimos cupos/);
  assert.match(source, /Falta apoyo/);
});

test("Mi disponibilidad conserva la congregación de la cuenta sin mostrar un selector", async () => {
  const source = await readFile("src/modules/campaigns/components/availability-form.tsx", "utf8");
  assert.match(source, /congregationId: view\.congregationId \?\? ""/);
  assert.doesNotMatch(source, /<select|Selecciona tu congregación/);
  assert.match(source, /Tu congregación no está incluida en esta campaña/);
});

test("Cobertura de Organización no duplica horarios en tarjetas amarillas", async () => {
  const source = await readFile("src/modules/campaigns/components/organization-pwa.tsx", "utf8");
  assert.doesNotMatch(source, /missing\.map\(/);
  assert.doesNotMatch(source, /bg-amber-50/);
  assert.match(source, /coverage\.map\(/);
  assert.match(source, /onClick=\{\(\) => see\(\{ \.\.\.b, d \}\)\}/);
});
