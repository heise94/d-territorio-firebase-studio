import "server-only";
import { createHash } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { readDashboardSource } from "./admin-dashboard-source";
import { campaignCollections as names } from "../lib/paths";
import type { BlockPoint, Point } from "../domain/types";
import type { Assignment } from "../domain/planner";

export const plannerLockCollection = "campaignPlannerLocks";
export const blockPointId = (timeBlockId: string, pointId: string) =>
  createHash("sha256")
    .update(JSON.stringify([timeBlockId, pointId]))
    .digest("hex");
export async function readPlannerSource(
  db: Firestore,
  tx: Transaction,
  campaignId: string,
) {
  const base = await readDashboardSource(db, tx, campaignId);
  const query = (name: string) =>
    tx.get(db.collection(name).where("campaignId", "==", campaignId));
  const lockRef = db.collection(plannerLockCollection).doc(campaignId);
  const [points, blockPoints, assignments, lock] = await Promise.all([
    query(names.points),
    query(names.blockPoints),
    query(names.assignments),
    tx.get(lockRef),
  ]);
  return {
    ...base,
    lockRef,
    revision: Number(lock.data()?.revision ?? 0),
    points: new Map(
      points.docs.map((doc) => [
        doc.id,
        { ...doc.data(), id: doc.id } as Point,
      ]),
    ),
    blockPoints: new Map(
      blockPoints.docs.map((doc) => [
        doc.id,
        { ...doc.data(), id: doc.id } as BlockPoint,
      ]),
    ),
    assignments: assignments.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id }) as Assignment,
    ),
  };
}
export type PlannerSource = Awaited<ReturnType<typeof readPlannerSource>>;
export const activeAssignments = (source: PlannerSource) =>
  source.assignments.filter(
    (assignment) =>
      assignment.status === "draft" || assignment.status === "published",
  );
export function acceptedUnit(source: PlannerSource, registrationId: string) {
  const pairs = source.pairs.filter(
    (pair) =>
      pair.status === "accepted" &&
      (pair.requesterRegistrationId === registrationId ||
        pair.recipientRegistrationId === registrationId),
  );
  if (pairs.length > 1) return null; // Corrupt exclusivity must never be guessed.
  const pair = pairs[0];
  return pair
    ? [
        registrationId,
        pair.requesterRegistrationId === registrationId
          ? pair.recipientRegistrationId
          : pair.requesterRegistrationId,
      ]
    : [registrationId];
}
