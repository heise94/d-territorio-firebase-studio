import type { BlockPoint, Point } from "./types";

export interface PointCapacity {
  minParticipants: number;
  maxParticipants: number;
}

export interface BlockCapacitySummary {
  activePointsCount: number;
  minParticipants: number;
  maxParticipants: number;
}

/**
 * Returns the operational participant bounds for a point.
 * Guarantees backward compatibility with legacy points that lack explicit bounds,
 * defaulting to min=2, max=2 (or legacy capacity if present).
 * Guarantees min >= 1 and max >= min.
 */
export function getPointCapacity(
  point: Partial<Point> | null | undefined,
): PointCapacity {
  const legacyCapacity =
    typeof (point as { capacity?: unknown })?.capacity === "number"
      ? Number((point as { capacity?: unknown }).capacity)
      : undefined;

  let min = 2;
  if (
    typeof point?.minParticipants === "number" &&
    !Number.isNaN(point.minParticipants) &&
    point.minParticipants >= 1
  ) {
    min = Math.floor(point.minParticipants);
  } else if (legacyCapacity !== undefined && legacyCapacity >= 1) {
    min = Math.floor(legacyCapacity);
  }

  let max = min;
  if (
    typeof point?.maxParticipants === "number" &&
    !Number.isNaN(point.maxParticipants) &&
    point.maxParticipants >= min
  ) {
    max = Math.floor(point.maxParticipants);
  } else if (legacyCapacity !== undefined && legacyCapacity >= min) {
    max = Math.floor(legacyCapacity);
  } else {
    max = Math.max(min, 2);
  }

  return { minParticipants: min, maxParticipants: max };
}

/**
 * Calculates operational capacity for a given time block based only on
 * campaign points that are:
 * 1. Globally active in the campaign (point.active === true)
 * 2. Explicitly active in this time block (blockPoint.active === true)
 *
 * Campaign points and block-points belonging to other campaigns are excluded.
 */
export function calculateBlockCapacity(
  campaignId: string,
  timeBlockId: string,
  campaignPoints: Point[],
  blockPoints: BlockPoint[],
): BlockCapacitySummary {
  const scopedPoints = campaignPoints.filter(
    (point) => point.campaignId === campaignId && point.active,
  );

  const activePointIdsInBlock = new Set(
    blockPoints
      .filter(
        (bp) =>
          bp.campaignId === campaignId &&
          bp.timeBlockId === timeBlockId &&
          bp.active,
      )
      .map((bp) => bp.pointId),
  );

  const activePoints = scopedPoints.filter((point) =>
    activePointIdsInBlock.has(point.id),
  );

  let minParticipants = 0;
  let maxParticipants = 0;

  for (const point of activePoints) {
    const capacity = getPointCapacity(point);
    minParticipants += capacity.minParticipants;
    maxParticipants += capacity.maxParticipants;
  }

  return {
    activePointsCount: activePoints.length,
    minParticipants,
    maxParticipants,
  };
}
