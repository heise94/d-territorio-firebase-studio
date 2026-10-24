import { Suspense } from "react";
import { ParticipantAuthForm } from "@/modules/campaigns/components/participant-auth-form";
import { CampaignLoading } from "@/modules/campaigns/components/campaign-loading";

export default function ParticipantLoginPage() {
  return <Suspense fallback={<CampaignLoading />}><ParticipantAuthForm /></Suspense>;
}
