import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json(
    { error: "Las invitaciones de responsables por congregación ya no están disponibles." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET() { return retired(); }
export async function POST() { return retired(); }
