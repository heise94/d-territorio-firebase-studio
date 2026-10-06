import { NextResponse } from "next/server";
import { deploymentErrors } from "@/modules/campaigns/lib/deployment";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET() {
  const ready = deploymentErrors(process.env).length === 0;
  const sha = process.env.CAMPAIGNS_BUILD_SHA;
  const deployedAt = process.env.CAMPAIGNS_DEPLOYED_AT;
  return NextResponse.json(
    {
      ready,
      environment: ["staging", "production"].includes(
        process.env.CAMPAIGNS_ENV ?? "",
      )
        ? process.env.CAMPAIGNS_ENV
        : "unconfigured",
      sha: sha && /^[a-f0-9]{40}$/.test(sha) ? sha : null,
      deployedAt:
        deployedAt && !Number.isNaN(Date.parse(deployedAt)) ? deployedAt : null,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
