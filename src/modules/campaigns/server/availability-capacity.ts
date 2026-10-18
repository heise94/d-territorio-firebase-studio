import "server-only";
import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { campaignCollections as names } from "../lib/paths";
import { calculateBlockCapacity } from "../domain/point-capacity";
import { participantSelectionClosed } from "../domain/registration";
import type { Point, BlockPoint } from "../domain/types";
import { AuthError } from "./auth/service";

/** Call after the caller's other reads. Touching each block serializes simultaneous additions. */
export async function reserveAvailabilityPlaces(
  tx: Transaction, db: Firestore, campaignId: string, addedBlockIds: string[],
) {
  if (!addedBlockIds.length) return;
  const query = (name: string) => tx.get(db.collection(name).where("campaignId", "==", campaignId));
  const [registrations, availability, points, associations, blocks] = await Promise.all([
    query(names.campaignRegistrations), query(names.availabilities), query(names.points), query(names.blockPoints),
    tx.getAll(...addedBlockIds.map((id) => db.collection(names.timeBlocks).doc(id))),
  ]);
  const active = new Set(registrations.docs.filter((doc) => doc.data().registrationStatus === "active").map((doc) => doc.id));
  for (const block of blocks) {
    if (!block.exists || block.data()?.campaignId !== campaignId || !block.data()?.active)
      throw new AuthError(409, "Uno de los horarios ya no está disponible.");
    const required = calculateBlockCapacity(campaignId, block.id,
      points.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Point),
      associations.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as BlockPoint)).minParticipants;
    const count = new Set(availability.docs.filter((doc) => doc.data().timeBlockId === block.id && doc.data().available === true && active.has(doc.data().registrationId)).map((doc) => doc.data().registrationId)).size;
    if (participantSelectionClosed(count, required))
      throw new AuthError(409, "Este horario ya completó sus cupos y apoyos de reemplazo. Selecciona otro horario; tus cambios todavía no se han guardado.");
  }
  for (const block of blocks) tx.update(db.collection(names.timeBlocks).doc(block.id), { availabilityUpdatedAt: Timestamp.now() });
}
