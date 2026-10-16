import "server-only";
import { campaignCollections as names } from "../lib/paths";
import type { Campaign, Point } from "../domain/types";
import { participantAuth } from "./auth/session";

export type ParticipantInformation = {
  id: string;
  name: string;
  intro: string;
  generalMapUrl?: string;
  pickup?: Campaign["information"] extends infer T ? T extends { pickup?: infer P } ? P : never : never;
  returnInfo?: Campaign["information"] extends infer T ? T extends { returnInfo?: infer P } ? P : never : never;
  contacts: NonNullable<NonNullable<Campaign["information"]>["contacts"]>;
  notes: NonNullable<NonNullable<Campaign["information"]>["notes"]>;
  points: Pick<Point, "id" | "name" | "locationText" | "description" | "mapUrl">[];
};

export async function participantInformation(token: string): Promise<ParticipantInformation[]> {
  return participantAuth().withParticipantTransaction(token, async (tx, participant) => {
    const db = (await import("./firebase-admin")).campaignsAdminDb();
    const registrations = await tx.get(db.collection(names.campaignRegistrations).where("participantId", "==", participant.id));
    const output: ParticipantInformation[] = [];
    for (const row of registrations.docs) {
      const registration = row.data();
      if (registration.registrationStatus !== "active") continue;
      const campaignDoc = await tx.get(db.collection(names.campaigns).doc(registration.campaignId));
      const campaign = campaignDoc.data() as Campaign | undefined;
      if (!campaign || campaign.status === "draft") continue;
      const points = await tx.get(db.collection(names.points).where("campaignId", "==", campaignDoc.id));
      const info = campaign.information;
      output.push({
        id: campaignDoc.id, name: campaign.name, intro: info?.intro ?? "", generalMapUrl: info?.generalMapUrl,
        pickup: info?.pickup, returnInfo: info?.returnInfo,
        contacts: info?.contacts ?? [], notes: info?.notes ?? [],
        points: points.docs.filter((point) => point.data().active === true).map((point) => {
          const data = point.data() as Point;
          return { id: point.id, name: data.name, locationText: data.locationText, description: data.description, mapUrl: data.mapUrl };
        }).sort((a, b) => a.name.localeCompare(b.name, "es")),
      });
    }
    return output.sort((a, b) => a.name.localeCompare(b.name, "es"));
  });
}
