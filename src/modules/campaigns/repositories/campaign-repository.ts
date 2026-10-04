import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { campaignCollections } from "../lib/paths";
import type {
  Campaign,
  CampaignCongregation,
  CampaignDay,
  Congregation,
  Point,
  TimeBlock,
} from "../domain/types";
import type {
  CampaignDayInput,
  CampaignInput,
  CongregationInput,
  PointInput,
  TimeBlockInput,
} from "../schemas/campaign-schemas";

const ref = (name: string) => collection(db, name);
const item = <T>(snapshot: { id: string; data: () => unknown }) => ({
  id: snapshot.id,
  ...(snapshot.data() as Omit<T, "id">),
});
const clean = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;

export const campaignRepository = {
  subscribeCampaigns(callback: (items: Campaign[]) => void) {
    return onSnapshot(
      query(ref(campaignCollections.campaigns), orderBy("updatedAt", "desc")),
      (snapshot) =>
        callback(snapshot.docs.map((entry) => item<Campaign>(entry))),
    );
  },
  async createCampaign(input: CampaignInput, createdBy?: string) {
    return (
      await addDoc(ref(campaignCollections.campaigns), {
        ...clean(input),
        createdBy: createdBy || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    ).id;
  },
  updateCampaign(id: string, input: CampaignInput) {
    const payload = clean(input);
    // Clearing an optional field must also clear its previously persisted value.
    // The sanitizer still removes only undefined; deletion is explicit here.
    for (const field of [
      "description",
      "locationName",
      "locationDetails",
      "defaultCapacityPerBlock",
      "maxPointsDefault",
    ] as const) {
      if (input[field] === undefined)
        Object.assign(payload, { [field]: deleteField() });
    }
    return updateDoc(doc(db, campaignCollections.campaigns, id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  },

  subscribeDays(campaignId: string, callback: (items: CampaignDay[]) => void) {
    return onSnapshot(
      query(
        ref(campaignCollections.campaignDays),
        where("campaignId", "==", campaignId),
        orderBy("sortOrder"),
      ),
      (snapshot) =>
        callback(snapshot.docs.map((entry) => item<CampaignDay>(entry))),
    );
  },
  async saveDay(
    campaignId: string,
    input: CampaignDayInput,
    existing?: CampaignDay,
  ) {
    const current = await getDocs(
      query(
        ref(campaignCollections.campaignDays),
        where("campaignId", "==", campaignId),
      ),
    );
    if (
      current.docs.some(
        (entry) =>
          entry.id !== existing?.id && entry.data().date === input.date,
      )
    )
      throw new Error("Ya existe un día con esa fecha.");
    if (existing)
      return updateDoc(
        doc(db, campaignCollections.campaignDays, existing.id),
        clean(input),
      );
    return addDoc(ref(campaignCollections.campaignDays), {
      ...clean(input),
      campaignId,
      sortOrder: current.size,
    });
  },
  async deleteDay(id: string) {
    const blocks = await getDocs(
      query(
        ref(campaignCollections.timeBlocks),
        where("campaignDayId", "==", id),
      ),
    );
    const batch = writeBatch(db);
    blocks.docs.forEach((block) => batch.delete(block.ref));
    batch.delete(doc(db, campaignCollections.campaignDays, id));
    return batch.commit();
  },

  subscribeBlocks(campaignId: string, callback: (items: TimeBlock[]) => void) {
    return onSnapshot(
      query(
        ref(campaignCollections.timeBlocks),
        where("campaignId", "==", campaignId),
        orderBy("sortOrder"),
      ),
      (snapshot) =>
        callback(snapshot.docs.map((entry) => item<TimeBlock>(entry))),
    );
  },
  async saveBlock(
    campaignId: string,
    campaignDayId: string,
    input: TimeBlockInput,
    existing?: TimeBlock,
  ) {
    const current = await getDocs(
      query(
        ref(campaignCollections.timeBlocks),
        where("campaignDayId", "==", campaignDayId),
      ),
    );
    if (
      current.docs.some(
        (entry) =>
          entry.id !== existing?.id &&
          entry.data().startTime === input.startTime &&
          entry.data().endTime === input.endTime,
      )
    )
      throw new Error("Ese bloque ya existe para este día.");
    if (existing)
      return updateDoc(
        doc(db, campaignCollections.timeBlocks, existing.id),
        clean(input),
      );
    return addDoc(ref(campaignCollections.timeBlocks), {
      ...clean(input),
      campaignId,
      campaignDayId,
      sortOrder: current.size,
    });
  },
  deleteBlock(id: string) {
    return deleteDoc(doc(db, campaignCollections.timeBlocks, id));
  },

  subscribeCongregations(callback: (items: Congregation[]) => void) {
    return onSnapshot(
      query(ref(campaignCollections.congregations), orderBy("name")),
      (snapshot) =>
        callback(snapshot.docs.map((entry) => item<Congregation>(entry))),
    );
  },
  saveCongregation(input: CongregationInput) {
    return addDoc(ref(campaignCollections.congregations), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
  subscribeCampaignCongregations(
    campaignId: string,
    callback: (items: CampaignCongregation[]) => void,
  ) {
    return onSnapshot(
      query(
        ref(campaignCollections.campaignCongregations),
        where("campaignId", "==", campaignId),
      ),
      (snapshot) =>
        callback(
          snapshot.docs.map((entry) => item<CampaignCongregation>(entry)),
        ),
    );
  },
  async addCampaignCongregation(campaignId: string, congregationId: string) {
    const current = await getDocs(
      query(
        ref(campaignCollections.campaignCongregations),
        where("campaignId", "==", campaignId),
        where("congregationId", "==", congregationId),
      ),
    );
    if (current.empty)
      return addDoc(ref(campaignCollections.campaignCongregations), {
        campaignId,
        congregationId,
      });
  },
  removeCampaignCongregation(id: string) {
    return deleteDoc(doc(db, campaignCollections.campaignCongregations, id));
  },

  subscribePoints(campaignId: string, callback: (items: Point[]) => void) {
    return onSnapshot(
      query(
        ref(campaignCollections.points),
        where("campaignId", "==", campaignId),
        orderBy("sortOrder"),
      ),
      (snapshot) => callback(snapshot.docs.map((entry) => item<Point>(entry))),
    );
  },
  async savePoint(campaignId: string, input: PointInput, existing?: Point) {
    if (existing)
      return updateDoc(
        doc(db, campaignCollections.points, existing.id),
        clean(input),
      );
    const current = await getDocs(
      query(
        ref(campaignCollections.points),
        where("campaignId", "==", campaignId),
      ),
    );
    return addDoc(ref(campaignCollections.points), {
      ...clean(input),
      campaignId,
      sortOrder: current.size,
    });
  },
  deletePoint(id: string) {
    return deleteDoc(doc(db, campaignCollections.points, id));
  },
};
