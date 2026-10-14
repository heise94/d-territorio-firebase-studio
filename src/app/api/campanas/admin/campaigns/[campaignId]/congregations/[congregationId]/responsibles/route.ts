import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json(
    { error: "Las responsabilidades por congregación ya no forman parte de las campañas." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET() { return retired(); }
export async function POST() { return retired(); }
