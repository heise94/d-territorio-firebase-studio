import { NextRequest, NextResponse } from "next/server";
import { getPublicJoinState } from "@/modules/campaigns/server/public-join";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getPublicJoinState(request.nextUrl.searchParams.get("campana") ?? undefined), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No pudimos cargar la información de la campaña." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
