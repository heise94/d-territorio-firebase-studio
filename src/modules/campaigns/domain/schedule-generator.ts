export interface GeneratedBlock {
  startTime: string;
  endTime: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generates sequential time blocks based on start time, duration in hours, and count.
 * Throws human-readable error messages if inputs are invalid or exceed the day.
 */
export function generateTimeBlocks(
  startTime: string,
  durationHours: number,
  count: number,
): GeneratedBlock[] {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new Error("La cantidad de bloques debe ser un número entero mayor a 0.");
  }
  if (durationHours <= 0) {
    throw new Error("La duración de cada bloque debe ser de al menos 1 hora.");
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const durationMinutes = Math.round(durationHours * 60);

  if (startMinutes < 0 || startMinutes >= 24 * 60) {
    throw new Error("La hora de inicio seleccionada es inválida.");
  }

  const blocks: GeneratedBlock[] = [];
  let currentMinutes = startMinutes;

  for (let i = 0; i < count; i++) {
    const endMinutes = currentMinutes + durationMinutes;
    if (endMinutes > 24 * 60) {
      throw new Error(
        `La cantidad (${count}) y duración (${durationHours}h) calculada supera las 24:00 del día. Reduce la cantidad de bloques o la duración.`,
      );
    }

    blocks.push({
      startTime: formatMinutesToTime(currentMinutes),
      endTime: formatMinutesToTime(endMinutes),
    });

    currentMinutes = endMinutes;
  }

  return blocks;
}

/**
 * Checks if any generated blocks overlap with existing blocks of the day,
 * or if there are internal overlaps.
 * Returns null if valid, or a descriptive human-readable error string if overlap detected.
 */
export function checkBlocksOverlap(
  existingBlocks: Array<{ startTime: string; endTime: string; id?: string }>,
  newBlocks: Array<{ startTime: string; endTime: string }>,
  excludeBlockId?: string,
): string | null {
  const filteredExisting = excludeBlockId
    ? existingBlocks.filter((b) => b.id !== excludeBlockId)
    : existingBlocks;

  // Check each new block against existing
  for (const newB of newBlocks) {
    for (const ex of filteredExisting) {
      if (newB.startTime < ex.endTime && ex.startTime < newB.endTime) {
        return `El bloque ${newB.startTime}–${newB.endTime} se superpone con el bloque existente ${ex.startTime}–${ex.endTime}.`;
      }
    }
  }

  // Check new blocks among themselves
  for (let i = 0; i < newBlocks.length; i++) {
    for (let j = i + 1; j < newBlocks.length; j++) {
      const b1 = newBlocks[i];
      const b2 = newBlocks[j];
      if (b1.startTime < b2.endTime && b2.startTime < b1.endTime) {
        return `Los bloques generados ${b1.startTime}–${b1.endTime} y ${b2.startTime}–${b2.endTime} se superponen entre sí.`;
      }
    }
  }

  return null;
}
