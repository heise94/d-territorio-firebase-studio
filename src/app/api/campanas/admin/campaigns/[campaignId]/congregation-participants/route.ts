import { dashboardResponse } from "@/modules/campaigns/server/admin-dashboard-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return dashboardResponse({ error: "Esta revisión ya no está disponible." }, 410);
}
