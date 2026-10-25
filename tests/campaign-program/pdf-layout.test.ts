import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProgramPerson, ProgramView } from "../../src/modules/campaigns/domain/program";
import {
  orderedProgramPdfPoints,
  programPdfCellNames,
  programPdfDayTitle,
  renderProgramPdf,
} from "../../src/modules/campaigns/server/program-pdf";

const pages = (bytes: Buffer) =>
  [...bytes.toString("latin1").matchAll(/\/Type \/Page\b/g)].length;
const person = (name: string, index: number): ProgramPerson => ({
  assignmentId: `assignment-${index}`,
  registrationId: `registration-${index}`,
  fullName: name,
  congregation: "No se exporta",
});
const cell = (pointId: string, names: string[] = []) => ({
  pointId,
  active: true,
  slots: [
    names[0] ? person(names[0], 0) : null,
    names[1] ? person(names[1], 1) : null,
    names[2] ? person(names[2], 2) : null,
    names[3] ? person(names[3], 3) : null,
  ] as [ProgramPerson | null, ProgramPerson | null, ProgramPerson | null, ProgramPerson | null],
});
function fixture(days = 2): ProgramView {
  const points = Array.from({ length: 8 }, (_, index) => ({
    id: `point-${index + 1}`,
    name: `Punto ${index + 1}`,
    locationText: "",
    description: "",
  }));
  return {
    mode: "draft",
    campaignStatus: "planning",
    version: null,
    publishedAt: null,
    plannerRevision: null,
    blockingErrors: [],
    warnings: [],
    assignmentCount: 0,
    snapshot: {
      campaign: { id: "campaign", name: "Campaña de prueba", locationName: "", locationDetails: "" },
      days: Array.from({ length: days }, (_, day) => ({
        id: `day-${day}`,
        date: day === 0 ? "2026-10-31" : "2026-11-01",
        label: "",
        points,
        blocks: Array.from({ length: 6 }, (_, block) => ({
          id: `block-${day}-${block}`,
          startTime: `${String(8 + block * 2).padStart(2, "0")}:00`,
          endTime: `${String(10 + block * 2).padStart(2, "0")}:00`,
          label: "",
          cells: points.map((point) =>
            cell(
              point.id,
              day === 0 && block === 0 && point.id === "point-1"
                ? ["Ana Pérez", "Beatriz Soto", "Carlos Díaz", "Daniela Rojas"]
                : [],
            ),
          ),
        })),
      })),
    },
  };
}

test("PDF diario: dos días producen dos páginas A4 horizontales", async () => {
  const bytes = await renderProgramPdf(fixture(2));
  assert.equal(pages(bytes), 2);
  assert.match(bytes.toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/);
});

test("PDF diario: un día produce una sola página", async () => {
  assert.equal(pages(await renderProgramPdf(fixture(1))), 1);
});

test("Tabla diaria conserva ocho puntos, seis horarios, cuatro personas y vacíos", () => {
  const view = fixture(1);
  const [day] = view.snapshot.days;
  assert.equal(orderedProgramPdfPoints(day.points).length, 8);
  assert.equal(day.blocks.sort((a, b) => a.startTime.localeCompare(b.startTime)).length, 6);
  assert.deepEqual(programPdfCellNames(day.blocks[0], "point-1"), [
    "Ana Pérez",
    "Beatriz Soto",
    "Carlos Díaz",
    "Daniela Rojas",
  ]);
  assert.deepEqual(programPdfCellNames(day.blocks[0], "point-2"), ["Sin asignar"]);
  assert.match(programPdfDayTitle("2026-10-31", ""), /^Sábado 31 de octubre$/);
});
