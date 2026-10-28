import { NextRequest, NextResponse } from "next/server";
import { organizationFailure, organizationService, organizationToken } from "@/modules/campaigns/server/organization-http";
import { renderProgramPdf, programPdfFilename } from "@/modules/campaigns/server/program-pdf";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const view = await organizationService().draftProgram(organizationToken(request), (await context.params).campaignId);
    const pdf = await renderProgramPdf(view);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${programPdfFilename(view)}"`, "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return organizationFailure(error); }
}
