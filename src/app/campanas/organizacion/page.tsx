import { requireParticipantSession } from "@/modules/campaigns/server/auth/session";
import { OrganizationEntry } from "@/modules/campaigns/components/organization-entry";
export const dynamic = "force-dynamic";
export default async function Page() { await requireParticipantSession(); return <OrganizationEntry />; }
