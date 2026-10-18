import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { ParticipantCampaigns } from "@/modules/campaigns/components/participant-campaigns";
import { ParticipantNavigation } from "@/modules/campaigns/components/participant-navigation";
import { ParticipantProfile } from "@/modules/campaigns/components/participant-profile";
import { campaignsAdminDb } from "@/modules/campaigns/server/firebase-admin";
import { campaignCollections } from "@/modules/campaigns/lib/paths";
import { APP_VERSION_LABEL } from "@/modules/campaigns/lib/app-version";
import { CampaignUpdateFooter } from "@/modules/campaigns/components/campaign-update-footer";
import { PairInbox } from "@/modules/campaigns/components/pair-inbox";

export const dynamic = "force-dynamic";
export default async function CampaignParticipantPage() {
  const participant = await requireParticipantSession();
  const congregation = participant.congregationId
    ? (
        await campaignsAdminDb()
          .collection(campaignCollections.congregations)
          .doc(participant.congregationId)
          .get()
      ).data()?.name
    : null;
  return (
    <main className="campaign-page space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Inicio</h1>
        <ParticipantProfile
          fullName={participant.fullName}
          congregation={
            typeof congregation === "string"
              ? congregation
              : "Sin congregación indicada"
          }
        />
      </header>
      <PairInbox compact />
      <ParticipantCampaigns />
      <CampaignUpdateFooter label={APP_VERSION_LABEL} />
      <ParticipantNavigation active="Inicio" />
    </main>
  );
}
