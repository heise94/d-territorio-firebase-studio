import { NextRequest, NextResponse } from "next/server";
import { getProgram } from "@/modules/campaigns/server/program-service";
import {
  renderProgramPdf,
  programPdfFilename,
} from "@/modules/campaigns/server/program-pdf";
import { programFailure } from "@/modules/campaigns/server/program-http";
import { organizerToken } from "@/modules/campaigns/server/admin-dashboard-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const view = await getProgram(
      organizerToken(request),
      (await context.params).campaignId,
    );
    const pdf = await renderProgramPdf(view);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${programPdfFilename(view)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Authorization",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return programFailure(error);
  }
}
