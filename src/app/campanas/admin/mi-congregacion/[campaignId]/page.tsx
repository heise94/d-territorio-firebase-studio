import { CongregationReview } from "@/modules/campaigns/components/congregation-review";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  return <CongregationReview campaignId={(await params).campaignId} />;
}
