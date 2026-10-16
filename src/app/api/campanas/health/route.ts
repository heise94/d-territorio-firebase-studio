import { NextResponse } from "next/server";
import { deploymentErrors } from "@/modules/campaigns/lib/deployment";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET() {
  const ready = deploymentErrors(process.env).length === 0;
  // Next embeds these constants from the source build, even if runtime env is stale.
  const sha = process.env.CAMPAIGNS_COMPILED_SHA;
  const builtAt = process.env.CAMPAIGNS_COMPILED_AT;
  return NextResponse.json(
    {
      ready,
      environment: ["staging", "production"].includes(
        process.env.CAMPAIGNS_ENV ?? "",
      )
        ? process.env.CAMPAIGNS_ENV
        : "unconfigured",
      sha: sha && /^[a-f0-9]{40}$/.test(sha) ? sha : null,
      shaSource: sha
        ? (process.env.CAMPAIGNS_COMPILED_SHA_SOURCE ?? null)
        : null,
      buildId: process.env.CAMPAIGNS_COMPILED_BUILD_ID ?? null,
      builtAt: builtAt && !Number.isNaN(Date.parse(builtAt)) ? builtAt : null,
      serviceRevision: process.env.K_REVISION ?? null,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
