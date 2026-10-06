import "server-only";
import { createHash } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import type { ProgramSnapshot, ProgramVersion } from "../domain/program";
import type { Assignment } from "../domain/planner";
import type { ChangeRequest } from "../domain/change-request";
import { changeConflictMessage } from "../domain/change-request";
import { campaignCollections as names } from "../lib/paths";
import { AuthError } from "./auth/service";
import { campaignsAdminDb } from "./firebase-admin";
import { draftSource, readVersion } from "./program-service";
import { projectProgram } from "./program-projection";
import { acceptedUnit, type PlannerSource } from "./planner-source";

export const changeLockCollection = "campaignChangeRequestLocks";
export const changeConflict = () => new AuthError(409, changeConflictMessage);
export function snapshotTurns(snapshot: ProgramSnapshot) {
  return snapshot.days.flatMap((day) =>
    day.blocks.flatMap((block) =>
      block.cells.flatMap((cell) =>
        cell.slots.flatMap((person, index) =>
          person
            ? [{ day, block, cell, person, slotNumber: (index + 1) as 1 | 2 }]
            : [],
        ),
      ),
    ),
  );
}
export { turnId, decodeTurn } from "./program-turn-locator";

export async function officialContext(tx: Transaction, campaignId: string) {
  const source = await draftSource(tx, campaignId);
  if (source.campaign.status !== "published")
    throw new AuthError(409, "La campaña no tiene programa publicado.");
  const version = await readVersion(
    tx,
    source.campaign.currentProgramVersionId!,
    campaignId,
  );
  if (version.version !== source.campaign.programVersion)
    throw changeConflict();
  const turns = snapshotTurns(version.snapshot);
  const ids = new Set(turns.map((t) => t.person.assignmentId));
  const operational = source.assignments.filter(
    (a) => a.status === "published",
  );
  if (
    operational.length !== ids.size ||
    operational.some(
      (a) =>
        !ids.has(a.id) ||
        !turns.some(
          (t) =>
            t.person.assignmentId === a.id &&
            t.person.registrationId === a.registrationId &&
            t.block.id === a.timeBlockId &&
            t.cell.pointId === a.pointId &&
            t.slotNumber === a.slotNumber,
        ),
    )
  )
    throw changeConflict();
  // F7's fingerprint covers assigned people. Resolution must also freeze the
  // reserve context reviewed by the organizer (names, availability, max and links).
  const revision = createHash("sha256")
    .update(
      JSON.stringify({
        programVersionId: version.id,
        planner: projectProgram(source, { published: true, allowEmpty: true })
          .plannerRevision,
        registrations: [...source.registrations]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, r]) => [
            id,
            r.participantId,
            r.registrationStatus,
            r.maxTurns,
          ]),
        profiles: [...source.profiles].sort(([a], [b]) => a.localeCompare(b)),
        selections: [...source.selections]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, blocks]) => [id, [...blocks].sort()]),
        pairs: source.pairs
          .map((p) => [
            p.id,
            p.status,
            p.requesterRegistrationId,
            p.recipientRegistrationId,
          ])
          .sort((a, b) => a[0].localeCompare(b[0])),
      }),
    )
    .digest("hex");
  return { source, version, turns, revision };
}
export async function readChange(
  tx: Transaction,
  campaignId: string,
  id: string,
) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
    throw new AuthError(400, "Solicitud inválida.");
  const row = await tx.get(
    campaignsAdminDb().collection(names.changeRequests).doc(id),
  );
  const request = row.data() as ChangeRequest | undefined;
  if (!request || request.campaignId !== campaignId)
    throw new AuthError(404, "Solicitud no disponible.");
  return { request, ref: row.ref };
}
export function reserves(
  source: PlannerSource,
  version: ProgramVersion,
  blockId: string,
) {
  const official = snapshotTurns(version.snapshot);
  const assigned = new Set(
    official
      .filter((t) => t.block.id === blockId)
      .map((t) => t.person.registrationId),
  );
  return [...source.registrations.values()]
    .filter(
      (reg) =>
        reg.registrationStatus === "active" &&
        source.profiles.get(reg.participantId)?.active === true &&
        source.selections.get(reg.id)?.has(blockId) &&
        !assigned.has(reg.id),
    )
    .map((reg) => {
      const profile = source.profiles.get(reg.participantId)!;
      const unit = acceptedUnit(source, reg.id);
      return {
        registrationId: reg.id,
        fullName: profile.fullName,
        congregation:
          source.congregations.get(profile.congregationId ?? "")?.name ?? "",
        assignedTurns: new Set(
          official
            .filter((t) => t.person.registrationId === reg.id)
            .map((t) => t.block.id),
        ).size,
        maxTurns: reg.maxTurns,
        available: true,
        accepted:
          unit && unit.length === 2
            ? {
                otherRegistrationId: unit[1],
                otherName:
                  source.profiles.get(
                    source.registrations.get(unit[1])?.participantId ?? "",
                  )?.fullName ?? "Persona no disponible",
              }
            : null,
      };
    })
    .sort(
      (a, b) =>
        a.fullName.localeCompare(b.fullName, "es") ||
        a.registrationId.localeCompare(b.registrationId),
    );
}
/** Only replaced cells change. Keep historical names, configuration and every unaffected slot frozen. */
export function resultingSnapshot(
  previous: ProgramSnapshot,
  assignments: Assignment[],
  projected: ProgramSnapshot,
): ProgramSnapshot {
  const next = structuredClone(previous);
  const added = new Map(
    snapshotTurns(projected).map((t) => [t.person.assignmentId, t.person]),
  );
  for (const day of next.days)
    for (const block of day.blocks)
      for (const cell of block.cells)
        cell.slots = ([1, 2] as const).map((slot) => {
          const row = assignments.find(
            (a) =>
              a.status === "published" &&
              a.timeBlockId === block.id &&
              a.pointId === cell.pointId &&
              a.slotNumber === slot,
          );
          if (!row) return null;
          return cell.slots[slot - 1]?.assignmentId === row.id
            ? cell.slots[slot - 1]
            : (added.get(row.id) ?? null);
        }) as typeof cell.slots;
  return next;
}
