import assert from "node:assert/strict";
import test from "node:test";
import { pointSchema } from "../src/modules/campaigns/schemas/campaign-schemas";
import {
  calculateBlockCapacity,
  getPointCapacity,
} from "../src/modules/campaigns/domain/point-capacity";
import { formatHumanDate } from "../src/modules/campaigns/components/campaign-schedule-settings";
import {
  checkBlocksOverlap,
  generateTimeBlocks,
} from "../src/modules/campaigns/domain/schedule-generator";
import type {
  BlockPoint,
  CampaignDay,
  Point,
  TimeBlock,
} from "../src/modules/campaigns/domain/types";

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

test("Generación automática de bloques: 1h, 2h, 3h, 4h y conteo exacto", () => {
  // 1 hora
  const b1 = generateTimeBlocks("08:00", 1, 3);
  assert.equal(b1.length, 3);
  assert.deepEqual(b1, [
    { startTime: "08:00", endTime: "09:00" },
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "10:00", endTime: "11:00" },
  ]);

  // 2 horas (5 bloques como en el ejemplo del producto)
  const b2 = generateTimeBlocks("08:00", 2, 5);
  assert.equal(b2.length, 5);
  assert.deepEqual(b2, [
    { startTime: "08:00", endTime: "10:00" },
    { startTime: "10:00", endTime: "12:00" },
    { startTime: "12:00", endTime: "14:00" },
    { startTime: "14:00", endTime: "16:00" },
    { startTime: "16:00", endTime: "18:00" },
  ]);

  // 3 horas
  const b3 = generateTimeBlocks("09:00", 3, 2);
  assert.equal(b3.length, 2);
  assert.deepEqual(b3, [
    { startTime: "09:00", endTime: "12:00" },
    { startTime: "12:00", endTime: "15:00" },
  ]);

  // 4 horas
  const b4 = generateTimeBlocks("10:00", 4, 2);
  assert.equal(b4.length, 2);
  assert.deepEqual(b4, [
    { startTime: "10:00", endTime: "14:00" },
    { startTime: "14:00", endTime: "18:00" },
  ]);
});

test("Generación automática: validaciones de medianoche y parámetros inválidos", () => {
  // Supera las 24:00
  assert.throws(
    () => generateTimeBlocks("20:00", 2, 3),
    /supera las 24:00 del día/i,
  );

  // Cantidad cero o negativa
  assert.throws(
    () => generateTimeBlocks("08:00", 2, 0),
    /mayor a 0/i,
  );
  assert.throws(
    () => generateTimeBlocks("08:00", 2, -1),
    /mayor a 0/i,
  );

  // Duración cero
  assert.throws(
    () => generateTimeBlocks("08:00", 0, 3),
    /al menos 1 hora/i,
  );

  // Hora de inicio inválida
  assert.throws(
    () => generateTimeBlocks("25:00", 1, 2),
    /inválida/i,
  );
});

test("Detección y prevención de superposición de bloques (overlap)", () => {
  const existing = [
    { id: "b1", startTime: "08:00", endTime: "10:00" },
    { id: "b2", startTime: "14:00", endTime: "16:00" },
  ];

  // Caso superpuesto con bloque existente
  const overlappingWithExisting = checkBlocksOverlap(existing, [
    { startTime: "09:00", endTime: "11:00" },
  ]);
  assert.ok(overlappingWithExisting);
  assert.match(overlappingWithExisting, /se superpone/i);

  // Caso perfectamente adyacente (sin superposición)
  const adjacent = checkBlocksOverlap(existing, [
    { startTime: "10:00", endTime: "12:00" },
    { startTime: "12:00", endTime: "14:00" },
  ]);
  assert.equal(adjacent, null);

  // Superposición interna entre los nuevos bloques generados
  const internalOverlap = checkBlocksOverlap([], [
    { startTime: "08:00", endTime: "11:00" },
    { startTime: "10:00", endTime: "12:00" },
  ]);
  assert.ok(internalOverlap);
  assert.match(internalOverlap, /se superponen entre sí/i);

  // Al editar un bloque, excludeBlockId evita conflicto consigo mismo
  const editingSelf = checkBlocksOverlap(
    existing,
    [{ startTime: "08:00", endTime: "10:00" }],
    "b1",
  );
  assert.equal(editingSelf, null);
});

test("Habilitación de puntos por defecto: solo puntos activos en la campaña", () => {
  const points: Point[] = [
    { id: "p1", campaignId: "c1", name: "Punto Activo 1", minParticipants: 2, maxParticipants: 2, active: true, sortOrder: 0 },
    { id: "p2", campaignId: "c1", name: "Punto Activo 2", minParticipants: 2, maxParticipants: 4, active: true, sortOrder: 1 },
    { id: "p3", campaignId: "c1", name: "Punto Inactivo", minParticipants: 3, maxParticipants: 6, active: false, sortOrder: 2 },
  ];

  // Simulación de la lógica de default enablement implementada en el repositorio:
  // Al crear un bloque, se asocian con active: true todos los puntos con active !== false
  const activePoints = points.filter((p) => p.active !== false);
  assert.equal(activePoints.length, 2);
  assert.ok(!activePoints.some((p) => p.id === "p3"));

  const newBlockId = "block-new";
  const defaultBlockPoints: BlockPoint[] = activePoints.map((pt) => ({
    id: `bp-${newBlockId}-${pt.id}`,
    campaignId: "c1",
    timeBlockId: newBlockId,
    pointId: pt.id,
    active: true,
  }));

  const capacity = calculateBlockCapacity("c1", newBlockId, points, defaultBlockPoints);
  assert.equal(capacity.activePointsCount, 2);
  assert.equal(capacity.minParticipants, 4); // 2 + 2
  assert.equal(capacity.maxParticipants, 6); // 2 + 4
});

test("Clonación de día: copia bloques y asociaciones de puntos, pero NO asignaciones ni participantes", () => {
  const sourceDay: CampaignDay = {
    id: "day-source",
    campaignId: "c1",
    date: "2026-10-31",
    label: "Sábado de apertura",
    active: true,
    sortOrder: 0,
  };

  const sourceBlocks: TimeBlock[] = [
    { id: "sb-1", campaignId: "c1", campaignDayId: sourceDay.id, startTime: "08:00", endTime: "10:00", active: true, sortOrder: 0 },
    { id: "sb-2", campaignId: "c1", campaignDayId: sourceDay.id, startTime: "10:00", endTime: "12:00", active: true, sortOrder: 1 },
  ];

  const sourceBlockPoints: BlockPoint[] = [
    { id: "sbp-1-p1", campaignId: "c1", timeBlockId: "sb-1", pointId: "p1", active: true },
    { id: "sbp-1-p2", campaignId: "c1", timeBlockId: "sb-1", pointId: "p2", active: true },
    { id: "sbp-2-p1", campaignId: "c1", timeBlockId: "sb-2", pointId: "p1", active: true },
    { id: "sbp-2-p2", campaignId: "c1", timeBlockId: "sb-2", pointId: "p2", active: false }, // desactivado específicamente
  ];

  // Simulación de los datos clonados
  const targetDayId = "day-target";
  const clonedBlocks = sourceBlocks.map((sb, idx) => ({
    id: `cloned-b-${idx}`,
    campaignId: "c1",
    campaignDayId: targetDayId,
    startTime: sb.startTime,
    endTime: sb.endTime,
    label: sb.label,
    active: sb.active,
    sortOrder: sb.sortOrder,
  }));

  const clonedBlockPoints = clonedBlocks.flatMap((cb, idx) => {
    const sBlock = sourceBlocks[idx];
    const bps = sourceBlockPoints.filter((bp) => bp.timeBlockId === sBlock.id);
    return bps.map((bp) => ({
      id: `cbp-${cb.id}-${bp.pointId}`,
      campaignId: "c1",
      timeBlockId: cb.id,
      pointId: bp.pointId,
      active: bp.active,
    }));
  });

  // Verificaciones de estructura operativa
  assert.equal(clonedBlocks.length, 2);
  assert.equal(clonedBlockPoints.length, 4);

  // Verificación de fidelidad de asociaciones
  const block2Points = clonedBlockPoints.filter((bp) => bp.timeBlockId === "cloned-b-1");
  const p2InBlock2 = block2Points.find((bp) => bp.pointId === "p2");
  assert.equal(p2InBlock2?.active, false);

  // Verificación estricta: ninguna entidad de participantes o asignaciones fue clonada
  const clonedEntityKeys = Object.keys(clonedBlocks[0]);
  assert.ok(!clonedEntityKeys.includes("assignments"));
  assert.ok(!clonedEntityKeys.includes("participants"));
  assert.ok(!clonedEntityKeys.includes("registrations"));
});

test("Modificación de puntos por bloque y recálculo reactivo de capacidad", () => {
  const points: Point[] = [
    { id: "p1", campaignId: "c1", name: "Entrada Principal", minParticipants: 2, maxParticipants: 4, active: true, sortOrder: 0 },
    { id: "p2", campaignId: "c1", name: "Costanera", minParticipants: 3, maxParticipants: 5, active: true, sortOrder: 1 },
    { id: "p3", campaignId: "c1", name: "Feria Artesanal", minParticipants: 2, maxParticipants: 2, active: true, sortOrder: 2 },
  ];

  const blockId = "test-block";

  // Estado inicial: todos seleccionados
  let bps: BlockPoint[] = [
    { id: "bp1", campaignId: "c1", timeBlockId: blockId, pointId: "p1", active: true },
    { id: "bp2", campaignId: "c1", timeBlockId: blockId, pointId: "p2", active: true },
    { id: "bp3", campaignId: "c1", timeBlockId: blockId, pointId: "p3", active: true },
  ];

  let cap = calculateBlockCapacity("c1", blockId, points, bps);
  assert.equal(cap.activePointsCount, 3);
  assert.equal(cap.minParticipants, 7); // 2 + 3 + 2
  assert.equal(cap.maxParticipants, 11); // 4 + 5 + 2

  // Deseleccionar Costanera (p2)
  bps = bps.map((bp) => (bp.pointId === "p2" ? { ...bp, active: false } : bp));
  cap = calculateBlockCapacity("c1", blockId, points, bps);
  assert.equal(cap.activePointsCount, 2);
  assert.equal(cap.minParticipants, 4); // 2 + 2
  assert.equal(cap.maxParticipants, 6); // 4 + 2

  // "Deseleccionar todos"
  bps = bps.map((bp) => ({ ...bp, active: false }));
  cap = calculateBlockCapacity("c1", blockId, points, bps);
  assert.equal(cap.activePointsCount, 0);
  assert.equal(cap.minParticipants, 0);
  assert.equal(cap.maxParticipants, 0);

  // "Seleccionar todos"
  bps = points.map((p) => ({
    id: `bp-${p.id}`,
    campaignId: "c1",
    timeBlockId: blockId,
    pointId: p.id,
    active: p.active,
  }));
  cap = calculateBlockCapacity("c1", blockId, points, bps);
  assert.equal(cap.activePointsCount, 3);
  assert.equal(cap.minParticipants, 7);
  assert.equal(cap.maxParticipants, 11);
});

