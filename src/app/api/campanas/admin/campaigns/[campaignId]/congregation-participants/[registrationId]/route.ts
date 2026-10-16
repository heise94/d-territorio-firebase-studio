import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH() {
  return NextResponse.json(
    { error: "La revisión por congregación ya no forma parte de las campañas." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
}
