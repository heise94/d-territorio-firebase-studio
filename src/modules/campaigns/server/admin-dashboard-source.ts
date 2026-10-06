import "server-only";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import type {
  Campaign,
  CampaignDay,
  Congregation,
  TimeBlock,
} from "../domain/types";
import type {
  CampaignRegistration,
  Availability,
} from "../domain/registration";
import type { PairRequest } from "../domain/pair-request";
import { campaignCollections as names } from "../lib/paths";
import { AuthError } from "./auth/service";

export interface OperationalProfile {
  fullName: string;
  congregationId?: string;
  active: boolean;
  phoneNormalized?: string;
}
/** One read-only transaction; profiles/congregations loaded in bulk with field masks. */
export async function readDashboardSource(
  db: Firestore,
  tx: Transaction,
  campaignId: string,
  phones = false,
) {
  const campaignDoc = await tx.get(
    db.collection(names.campaigns).doc(campaignId),
  );
  if (!campaignDoc.exists) throw new AuthError(404, "Campaña no disponible.");
  const campaign = campaignDoc.data() as Campaign;
  const query = (collection: string) =>
    tx.get(db.collection(collection).where("campaignId", "==", campaignId));
  const [
    registrationDocs,
    availabilityDocs,
    dayDocs,
    blockDocs,
    pairDocs,
    associations,
  ] = await Promise.all([
    query(names.campaignRegistrations),
    query(names.availabilities),
    query(names.campaignDays),
    query(names.timeBlocks),
    query(names.pairRequests),
    query(names.campaignCongregations),
  ]);
  const registrations = new Map(
    registrationDocs.docs.map((doc) => [
      doc.id,
      { ...doc.data(), id: doc.id } as CampaignRegistration,
    ]),
  );
  const days = new Map(
    dayDocs.docs.map((doc) => [
      doc.id,
      { ...doc.data(), id: doc.id } as CampaignDay,
    ]),
  );
  const blocks = new Map(
    blockDocs.docs.map((doc) => [
      doc.id,
      { ...doc.data(), id: doc.id } as TimeBlock,
    ]),
  );
  const activeBlocks = new Map(
    [...blocks].filter(
      ([, block]) => block.active && days.get(block.campaignDayId)?.active,
    ),
  );
  const participantIds = [
    ...new Set([...registrations.values()].map((row) => row.participantId)),
  ];
  const profiles = new Map<string, OperationalProfile>();
  if (participantIds.length) {
    const docs = await tx.getAll(
      ...participantIds.map((id) => db.collection(names.participants).doc(id)),
      {
        fieldMask: [
          "fullName",
          "congregationId",
          "active",
          ...(phones ? ["phoneNormalized"] : []),
        ],
      },
    );
    for (const doc of docs)
      if (doc.exists) profiles.set(doc.id, doc.data() as OperationalProfile);
  }
  const congregationIds = [
    ...new Set([
      ...associations.docs.map((doc) => doc.data().congregationId as string),
      ...[...profiles.values()].flatMap((profile) =>
        profile.congregationId ? [profile.congregationId] : [],
      ),
    ]),
  ];
  const congregations = new Map<string, Congregation>();
  if (congregationIds.length) {
    const docs = await tx.getAll(
      ...congregationIds.map((id) =>
        db.collection(names.congregations).doc(id),
      ),
      { fieldMask: ["name", "active"] },
    );
    for (const doc of docs)
      if (doc.exists) congregations.set(doc.id, doc.data() as Congregation);
  }
  const selections = new Map<string, Set<string>>();
  for (const doc of availabilityDocs.docs) {
    const row = doc.data() as Availability;
    if (row.available !== true || !registrations.has(row.registrationId))
      continue;
    const selected = selections.get(row.registrationId) ?? new Set<string>();
    selected.add(row.timeBlockId);
    selections.set(row.registrationId, selected);
  }
  const pairs = pairDocs.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as PairRequest)
    .filter(
      (pair) =>
        registrations.has(pair.requesterRegistrationId) &&
        registrations.has(pair.recipientRegistrationId),
    );
  return {
    campaign,
    campaignId,
    registrations,
    days,
    blocks,
    activeBlocks,
    profiles,
    congregations,
    selections,
    pairs,
  };
}
export type DashboardSource = Awaited<ReturnType<typeof readDashboardSource>>;
