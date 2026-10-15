import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { OrganizationPwa } from "@/modules/campaigns/components/organization-pwa";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) { await requireParticipantSession(); return <OrganizationPwa campaignId={(await params).campaignId} />; }
