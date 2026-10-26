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
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { campaignCollections } from "../lib/paths";
import { cleanFirestorePayload } from "../lib/firestore-payload";
import { computeBlockPointId } from "../lib/block-point-id";
import type {
  BlockPoint,
  Campaign,
  CampaignInformation,
  CampaignCongregation,
  CampaignDay,
  Congregation,
  Point,
  TimeBlock,
} from "../domain/types";
import {
  campaignDaySchema,
  pointSchema,
  type CampaignDayInput,
  type CampaignInput,
  type CongregationInput,
  type PointInput,
  type TimeBlockInput,
} from "../schemas/campaign-schemas";
import { checkBlocksOverlap } from "../domain/schedule-generator";

const ref = (name: string) => collection(db, name);
const item = <T>(snapshot: { id: string; data: () => unknown }) => ({
  id: snapshot.id,
  ...(snapshot.data() as Omit<T, "id">),
});
const clean = cleanFirestorePayload;

export const campaignRepository = {
  /**
   * A scoped campaign administrator may only read their granted campaign.
   * Do not implement this as a collection query: Firestore rules correctly
   * reject a query that could return campaigns outside that grant.
   */
  subscribeCampaign(
    campaignId: string,
    callback: (campaign: Campaign | null) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(db, campaignCollections.campaigns, campaignId),
      (snapshot) => callback(snapshot.exists() ? item<Campaign>(snapshot) : null),
      (error) => onError?.(error),
    );
  },
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
        companionRequestsEnabled: false,
        createdBy: createdBy || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    ).id;
  },
  updateCampaign(id: string, input: CampaignInput) {
    const payload = clean(input);
    // Status is changed only by the authorized transactional status endpoint.
    // A stale general-information form must never roll planning back to open.
    const { status: _status, ...editable } = payload;
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
        Object.assign(editable, { [field]: deleteField() });
    }
    return updateDoc(doc(db, campaignCollections.campaigns, id), {
      ...editable,
      updatedAt: serverTimestamp(),
    });
  },
  setCompanionRequestsEnabled(id: string, enabled: boolean) {
    return updateDoc(doc(db, campaignCollections.campaigns, id), {
      companionRequestsEnabled: enabled,
      updatedAt: serverTimestamp(),
    });
  },
  updateCampaignInformation(
    id: string,
    information: CampaignInformation | undefined,
  ) {
    return updateDoc(doc(db, campaignCollections.campaigns, id), {
      information: information ? clean(information) : deleteField(),
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
    for (const block of blocks.docs) {
      const blockPoints = await getDocs(
        query(
          ref(campaignCollections.blockPoints),
          where("timeBlockId", "==", block.id),
        ),
      );
      blockPoints.docs.forEach((bp) => batch.delete(bp.ref));
      batch.delete(block.ref);
    }
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

    const existingBlocks = current.docs.map((d) => ({
      id: d.id,
      startTime: d.data().startTime as string,
      endTime: d.data().endTime as string,
    }));
    const overlapError = checkBlocksOverlap(
      existingBlocks,
      [{ startTime: input.startTime, endTime: input.endTime }],
      existing?.id,
    );
    if (overlapError) throw new Error(overlapError);

    if (existing)
      return updateDoc(
        doc(db, campaignCollections.timeBlocks, existing.id),
        clean(input),
      );

    const newBlockRef = await addDoc(ref(campaignCollections.timeBlocks), {
      ...clean(input),
      campaignId,
      campaignDayId,
      sortOrder: current.size,
    });

    // Default enablement: enable all globally active points for this new block
    const pointsSnapshot = await getDocs(
      query(
        ref(campaignCollections.points),
        where("campaignId", "==", campaignId),
      ),
    );
    const activePoints = pointsSnapshot.docs.filter(
      (p) => p.data().active !== false,
    );
    if (activePoints.length > 0) {
      const batch = writeBatch(db);
      for (const pt of activePoints) {
        const bpId = await computeBlockPointId(newBlockRef.id, pt.id);
        batch.set(
          doc(db, campaignCollections.blockPoints, bpId),
          {
            campaignId,
            timeBlockId: newBlockRef.id,
            pointId: pt.id,
            active: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();
    }

    return newBlockRef;
  },
  async saveGeneratedBlocks(
    campaignId: string,
    campaignDayId: string,
    blocksToCreate: Array<{ startTime: string; endTime: string; label?: string }>,
  ) {
    if (!blocksToCreate.length) return;
    const current = await getDocs(
      query(
        ref(campaignCollections.timeBlocks),
        where("campaignDayId", "==", campaignDayId),
      ),
    );
    const existingBlocks = current.docs.map((d) => ({
      id: d.id,
      startTime: d.data().startTime as string,
      endTime: d.data().endTime as string,
    }));

    const overlapError = checkBlocksOverlap(existingBlocks, blocksToCreate);
    if (overlapError) throw new Error(overlapError);

    const pointsSnapshot = await getDocs(
      query(
        ref(campaignCollections.points),
        where("campaignId", "==", campaignId),
      ),
    );
    const activePoints = pointsSnapshot.docs.filter(
      (p) => p.data().active !== false,
    );

    const batch = writeBatch(db);
    let sortOrder = current.size;

    for (const b of blocksToCreate) {
      const newBlockRef = doc(collection(db, campaignCollections.timeBlocks));
      batch.set(newBlockRef, {
        campaignId,
        campaignDayId,
        startTime: b.startTime,
        endTime: b.endTime,
        label: b.label || null,
        active: true,
        sortOrder: sortOrder++,
      });

      for (const pt of activePoints) {
        const bpId = await computeBlockPointId(newBlockRef.id, pt.id);
        batch.set(
          doc(db, campaignCollections.blockPoints, bpId),
          {
            campaignId,
            timeBlockId: newBlockRef.id,
            pointId: pt.id,
            active: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    await batch.commit();
  },
  async cloneDay(
    campaignId: string,
    sourceDayId: string,
    newDayInput: CampaignDayInput,
  ) {
    const dayInput = campaignDaySchema.parse(newDayInput);
    const currentDays = await getDocs(
      query(
        ref(campaignCollections.campaignDays),
        where("campaignId", "==", campaignId),
      ),
    );
    if (currentDays.docs.some((d) => d.data().date === dayInput.date)) {
      throw new Error("Ya existe un día configurado con esta fecha.");
    }

    const newDayRef = await addDoc(ref(campaignCollections.campaignDays), {
      ...clean(dayInput),
      campaignId,
      sortOrder: currentDays.size,
    });

    const sourceBlocks = await getDocs(
      query(
        ref(campaignCollections.timeBlocks),
        where("campaignDayId", "==", sourceDayId),
      ),
    );

    if (sourceBlocks.empty) {
      return newDayRef;
    }

    const batch = writeBatch(db);
    for (const sBlock of sourceBlocks.docs) {
      const sData = sBlock.data();
      const newBlockRef = doc(collection(db, campaignCollections.timeBlocks));
      batch.set(newBlockRef, {
        campaignId,
        campaignDayId: newDayRef.id,
        startTime: sData.startTime,
        endTime: sData.endTime,
        label: sData.label ?? null,
        active: sData.active ?? true,
        sortOrder: sData.sortOrder ?? 0,
      });

      const sourceBpDocs = await getDocs(
        query(
          ref(campaignCollections.blockPoints),
          where("timeBlockId", "==", sBlock.id),
        ),
      );

      for (const bpDoc of sourceBpDocs.docs) {
        const bpData = bpDoc.data();
        const newBpId = await computeBlockPointId(newBlockRef.id, bpData.pointId);
        batch.set(
          doc(db, campaignCollections.blockPoints, newBpId),
          {
            campaignId,
            timeBlockId: newBlockRef.id,
            pointId: bpData.pointId,
            active: bpData.active ?? true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    await batch.commit();
    return newDayRef;
  },
  async saveBlockPointsForBlock(
    campaignId: string,
    timeBlockId: string,
    pointStates: Array<{ pointId: string; active: boolean }>,
  ) {
    const batch = writeBatch(db);
    for (const item of pointStates) {
      const id = await computeBlockPointId(timeBlockId, item.pointId);
      batch.set(
        doc(db, campaignCollections.blockPoints, id),
        {
          campaignId,
          timeBlockId,
          pointId: item.pointId,
          active: item.active,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    return batch.commit();
  },
  async deleteBlock(id: string) {
    const blockPoints = await getDocs(
      query(
        ref(campaignCollections.blockPoints),
        where("timeBlockId", "==", id),
      ),
    );
    const batch = writeBatch(db);
    blockPoints.docs.forEach((bp) => batch.delete(bp.ref));
    batch.delete(doc(db, campaignCollections.timeBlocks, id));
    return batch.commit();
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
  async savePoint(campaignId: string, rawInput: PointInput, existing?: Point) {
    const input = pointSchema.parse(rawInput);
    if (existing) {
      const payload = clean(input);
      if (input.mapUrl === undefined)
        Object.assign(payload, { mapUrl: deleteField() });
      return updateDoc(
        doc(db, campaignCollections.points, existing.id),
        payload,
      );
    }
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
  async deletePoint(id: string) {
    const blockPoints = await getDocs(
      query(
        ref(campaignCollections.blockPoints),
        where("pointId", "==", id),
      ),
    );
    const batch = writeBatch(db);
    blockPoints.docs.forEach((bp) => batch.delete(bp.ref));
    batch.delete(doc(db, campaignCollections.points, id));
    return batch.commit();
  },

  subscribeBlockPoints(
    campaignId: string,
    callback: (items: BlockPoint[]) => void,
  ) {
    return onSnapshot(
      query(
        ref(campaignCollections.blockPoints),
        where("campaignId", "==", campaignId),
      ),
      (snapshot) =>
        callback(snapshot.docs.map((entry) => item<BlockPoint>(entry))),
    );
  },
  async saveBlockPoint(
    campaignId: string,
    timeBlockId: string,
    pointId: string,
    active: boolean,
  ) {
    const id = await computeBlockPointId(timeBlockId, pointId);
    return setDoc(
      doc(db, campaignCollections.blockPoints, id),
      {
        campaignId,
        timeBlockId,
        pointId,
        active,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
