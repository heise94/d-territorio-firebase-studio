import assert from "node:assert/strict";
import test from "node:test";
import { pointSchema } from "../src/modules/campaigns/schemas/campaign-schemas";
import {
  calculateBlockCapacity,
  getPointCapacity,
} from "../src/modules/campaigns/domain/point-capacity";
import { formatHumanDate } from "../src/modules/campaigns/components/campaign-schedule-settings";
import type { BlockPoint, Point } from "../src/modules/campaigns/domain/types";

test("Punto nuevo default 2/2", () => {
  const result = pointSchema.parse({ name: "Acceso Principal" });
  assert.equal(result.name, "Acceso Principal");
  assert.equal(result.minParticipants, 2);
  assert.equal(result.maxParticipants, 2);
  assert.equal(result.active, true);
});

test("Mínimo configurable", () => {
  const numeric = pointSchema.parse({
    name: "Punto Grande",
    minParticipants: 3,
    maxParticipants: 5,
  });
  assert.equal(numeric.minParticipants, 3);
  assert.equal(numeric.maxParticipants, 5);

  const fromString = pointSchema.parse({
    name: "Punto Form",
    minParticipants: "4",
    maxParticipants: "6",
  });
  assert.equal(fromString.minParticipants, 4);
  assert.equal(fromString.maxParticipants, 6);
});

test("Máximo configurable", () => {
  const result = pointSchema.parse({
    name: "Punto Amplio",
    minParticipants: 2,
    maxParticipants: 8,
  });
  assert.equal(result.maxParticipants, 8);
});

test("Regla max >= min con mensajes humanos claros", () => {
  // Valid equality
  const eq = pointSchema.safeParse({
    name: "Punto 2-2",
    minParticipants: 2,
    maxParticipants: 2,
  });
  assert.equal(eq.success, true);

  // Invalid: min 4 / max 2
  const invalid = pointSchema.safeParse({
    name: "Punto Inválido",
    minParticipants: 4,
    maxParticipants: 2,
  });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    const issue = invalid.error.issues[0];
    assert.equal(
      issue.message,
      "El máximo de hermanos no puede ser menor que el mínimo.",
    );
  }

  // Invalid: min < 1
  const invalidMin = pointSchema.safeParse({
    name: "Punto Cero",
    minParticipants: 0,
    maxParticipants: 2,
  });
  assert.equal(invalidMin.success, false);
  if (!invalidMin.success) {
    const issue = invalidMin.error.issues[0];
    assert.equal(issue.message, "El mínimo debe ser al menos 1 hermano.");
  }
});

test("Puntos legacy compatibles con valores por defecto y migración suave", () => {
  // Punto antiguo sin campos min/max
  const legacyPoint: Partial<Point> = {
    id: "leg-1",
    campaignId: "c1",
    name: "Punto Antiguo",
    active: true,
    sortOrder: 0,
  };
  const cap1 = getPointCapacity(legacyPoint);
  assert.equal(cap1.minParticipants, 2);
  assert.equal(cap1.maxParticipants, 2);

  // Punto antiguo con campo capacity (si existiese)
  const legacyWithCapacity = {
    id: "leg-2",
    campaignId: "c1",
    name: "Punto Con Capacidad Legacy",
    capacity: 4,
    active: true,
    sortOrder: 1,
  };
  const cap2 = getPointCapacity(legacyWithCapacity as unknown as Point);
  assert.equal(cap2.minParticipants, 4);
  assert.equal(cap2.maxParticipants, 4);

  // Punto nuevo con campos explícitos
  const modernPoint: Partial<Point> = {
    id: "mod-1",
    campaignId: "c1",
    name: "Punto Moderno",
    minParticipants: 3,
    maxParticipants: 6,
    active: true,
  };
  const cap3 = getPointCapacity(modernPoint);
  assert.equal(cap3.minParticipants, 3);
  assert.equal(cap3.maxParticipants, 6);
});

test("Cálculo automático de capacidad mínima y máxima por bloque", () => {
  const campaignId = "camp-alpha";
  const blockId = "block-08-10";

  const points: Point[] = [
    {
      id: "p-a",
      campaignId,
      name: "Punto A",
      minParticipants: 2,
      maxParticipants: 2,
      active: true,
      sortOrder: 0,
    },
    {
      id: "p-b",
      campaignId,
      name: "Punto B",
      minParticipants: 2,
      maxParticipants: 4,
      active: true,
      sortOrder: 1,
    },
    {
      id: "p-c",
      campaignId,
      name: "Punto C",
      minParticipants: 4,
      maxParticipants: 6,
      active: true,
      sortOrder: 2,
    },
  ];

  const blockPoints: BlockPoint[] = [
    { id: "bp-a", campaignId, timeBlockId: blockId, pointId: "p-a", active: true },
    { id: "bp-b", campaignId, timeBlockId: blockId, pointId: "p-b", active: true },
    { id: "bp-c", campaignId, timeBlockId: blockId, pointId: "p-c", active: true },
  ];

  const summary = calculateBlockCapacity(campaignId, blockId, points, blockPoints);
  assert.equal(summary.activePointsCount, 3);
  assert.equal(summary.minParticipants, 8); // 2 + 2 + 4 = 8
  assert.equal(summary.maxParticipants, 12); // 2 + 4 + 6 = 12
});

test("Punto inactivo en la campaña no suma a la capacidad del bloque", () => {
  const campaignId = "camp-alpha";
  const blockId = "block-08-10";

  const points: Point[] = [
    {
      id: "p-a",
      campaignId,
      name: "Punto A",
      minParticipants: 2,
      maxParticipants: 2,
      active: true,
      sortOrder: 0,
    },
    {
      id: "p-b",
      campaignId,
      name: "Punto B (Inactivo)",
      minParticipants: 2,
      maxParticipants: 4,
      active: false, // Inactivo global
      sortOrder: 1,
    },
    {
      id: "p-c",
      campaignId,
      name: "Punto C",
      minParticipants: 4,
      maxParticipants: 6,
      active: true,
      sortOrder: 2,
    },
  ];

  const blockPoints: BlockPoint[] = [
    { id: "bp-a", campaignId, timeBlockId: blockId, pointId: "p-a", active: true },
    { id: "bp-b", campaignId, timeBlockId: blockId, pointId: "p-b", active: true },
    { id: "bp-c", campaignId, timeBlockId: blockId, pointId: "p-c", active: true },
  ];

  const summary = calculateBlockCapacity(campaignId, blockId, points, blockPoints);
  assert.equal(summary.activePointsCount, 2);
  assert.equal(summary.minParticipants, 6); // 2 + 4 = 6 (Punto B no suma)
  assert.equal(summary.maxParticipants, 8); // 2 + 6 = 8 (Punto B no suma)
});

test("Punto no habilitado para ese bloque no suma a la capacidad", () => {
  const campaignId = "camp-alpha";
  const blockId = "block-08-10";

  const points: Point[] = [
    {
      id: "p-a",
      campaignId,
      name: "Punto A",
      minParticipants: 2,
      maxParticipants: 2,
      active: true,
      sortOrder: 0,
    },
    {
      id: "p-b",
      campaignId,
      name: "Punto B",
      minParticipants: 2,
      maxParticipants: 4,
      active: true,
      sortOrder: 1,
    },
    {
      id: "p-c",
      campaignId,
      name: "Punto C",
      minParticipants: 4,
      maxParticipants: 6,
      active: true,
      sortOrder: 2,
    },
  ];

  // Solo p-a y p-b están activos en este bloque; p-c no habilitado
  const blockPoints: BlockPoint[] = [
    { id: "bp-a", campaignId, timeBlockId: blockId, pointId: "p-a", active: true },
    { id: "bp-b", campaignId, timeBlockId: blockId, pointId: "p-b", active: true },
    { id: "bp-c", campaignId, timeBlockId: blockId, pointId: "p-c", active: false },
  ];

  const summary = calculateBlockCapacity(campaignId, blockId, points, blockPoints);
  assert.equal(summary.activePointsCount, 2);
  assert.equal(summary.minParticipants, 4); // 2 + 2 = 4
  assert.equal(summary.maxParticipants, 6); // 2 + 4 = 6
});

test("Activar/inactivar punto conserva su configuración de capacidad", () => {
  const point: Point = {
    id: "p-custom",
    campaignId: "c1",
    name: "Plaza Central",
    locationText: "Frente a la fuente",
    description: "Punto de alto flujo",
    mapUrl: "https://maps.google.com/?q=plaza",
    minParticipants: 3,
    maxParticipants: 5,
    active: true,
    sortOrder: 0,
  };

  // Simulación de toggle de estado como lo hace la UI
  const toggledPayload = {
    name: point.name,
    locationText: point.locationText,
    description: point.description,
    mapUrl: point.mapUrl,
    minParticipants: point.minParticipants,
    maxParticipants: point.maxParticipants,
    active: !point.active,
  };

  const parsed = pointSchema.parse(toggledPayload);
  assert.equal(parsed.active, false);
  assert.equal(parsed.minParticipants, 3);
  assert.equal(parsed.maxParticipants, 5);
  assert.equal(parsed.name, "Plaza Central");
});

test("Aislamiento estricto entre campañas para puntos y bloques", () => {
  const points: Point[] = [
    {
      id: "p-c1",
      campaignId: "camp-1",
      name: "Punto Campaña 1",
      minParticipants: 3,
      maxParticipants: 5,
      active: true,
      sortOrder: 0,
    },
    {
      id: "p-c2",
      campaignId: "camp-2", // Otra campaña
      name: "Punto Campaña 2",
      minParticipants: 4,
      maxParticipants: 8,
      active: true,
      sortOrder: 0,
    },
  ];

  const blockPoints: BlockPoint[] = [
    { id: "bp-1", campaignId: "camp-1", timeBlockId: "blk-1", pointId: "p-c1", active: true },
    { id: "bp-2", campaignId: "camp-2", timeBlockId: "blk-1", pointId: "p-c2", active: true },
  ];

  const summary1 = calculateBlockCapacity("camp-1", "blk-1", points, blockPoints);
  assert.equal(summary1.activePointsCount, 1);
  assert.equal(summary1.minParticipants, 3);
  assert.equal(summary1.maxParticipants, 5);

  const summary2 = calculateBlockCapacity("camp-2", "blk-1", points, blockPoints);
  assert.equal(summary2.activePointsCount, 1);
  assert.equal(summary2.minParticipants, 4);
  assert.equal(summary2.maxParticipants, 8);
});

test("Formato humano para fechas de días (ej. Sábado 31 de octubre)", () => {
  assert.equal(formatHumanDate("2026-10-31"), "Sábado 31 de octubre");
  assert.equal(formatHumanDate("2026-11-01"), "Domingo 1 de noviembre");
});
