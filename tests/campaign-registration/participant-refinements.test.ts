import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { AvailabilitySummary } from "../../src/modules/campaigns/components/availability-summary";
import { participantSelectionClosed } from "../../src/modules/campaigns/domain/registration";
import { participantDTO, type Participant } from "../../src/modules/campaigns/domain/participant";
import { registrationSchema } from "../../src/modules/campaigns/schemas/participant-auth";
import { PairRequestSheet } from "../../src/modules/campaigns/components/pair-request-sheet";

test("cupo permite dos apoyos y bloquea el siguiente sin inventar límites sin configuración", () => {
  for (const count of [0, 15, 16, 17]) assert.equal(participantSelectionClosed(count, 16), false);
  for (const count of [18, 19, 100]) assert.equal(participantSelectionClosed(count, 16), true);
  assert.equal(participantSelectionClosed(100, 0), false);
});

test("selector de compañero no anida formularios ni envía accidentalmente la disponibilidad", () => {
  const markup = renderToStaticMarkup(createElement(PairRequestSheet, { campaignId: "a", timeBlockId: "b", label: "Horario", onClose() {}, onSent() {} }));
  assert.doesNotMatch(markup, /<form/);
  assert.ok((markup.match(/<button[^>]*>/g) ?? []).every((button) => button.includes('type="button"')));
  assert.match(markup, /tres letras/);
});

test("nuevo registro formatea el nombre y edición manual conserva de en todos los DTO", () => {
  const registration = registrationSchema.parse({ fullName: "arlet de heise", phone: "87654321", pin: "1234", confirmPin: "1234", congregationId: "a" });
  assert.equal(registration.fullName, "Arlet De Heise");
  const profile = { id: "test", fullName: "Arlet de Heise", active: true, preserveNameCase: true } as Participant;
  assert.equal(participantDTO(profile).fullName, "Arlet de Heise");
  assert.equal(participantDTO({ ...profile, preserveNameCase: false }).fullName, "Arlet De Heise");
});

test("resumen agrupa horarios guardados por día e incluye compañero sin mostrar horarios no seleccionados", () => {
  const markup = renderToStaticMarkup(createElement(AvailabilitySummary, { days: [
    { id: "sat", date: "2026-10-31", blocks: [
      { id: "one", startTime: "10:00", endTime: "12:00", selected: true, companions: ["Arlet de Heise · Confirmado"] },
      { id: "two", startTime: "12:00", endTime: "14:00", selected: true },
      { id: "three", startTime: "08:00", endTime: "10:00", selected: false },
    ] },
    { id: "sun", date: "2026-11-01", blocks: [{ id: "four", startTime: "10:00", endTime: "12:00", selected: true }] },
  ] }));
  assert.match(markup, /sábado,? 31 de octubre/i);
  assert.match(markup, /domingo,? 1 de noviembre/i);
  assert.match(markup, /Arlet de Heise · Confirmado/);
  assert.doesNotMatch(markup, /08:00/);
  assert.equal((markup.match(/<section/g) ?? []).length, 2);
});
