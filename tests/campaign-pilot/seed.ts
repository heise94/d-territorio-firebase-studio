import assert from "node:assert/strict";
import { deleteApp } from "firebase-admin/app";
import { seedPilotFixture, fixtureCampaign } from "./fixture";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import {
  getProgram,
  publishProgram,
} from "../../src/modules/campaigns/server/program-service";
async function main() {
  const size = Number(process.argv[2] ?? 80);
  assert.ok(size === 80 || size === 150);
  try {
    const data = await seedPilotFixture(size);
    if (process.argv[3] === "published") {
      const draft = await getProgram(data.token, fixtureCampaign);
      await publishProgram(data.token, fixtureCampaign, {
        expectedPlannerRevision: draft.plannerRevision,
        confirmWarnings: true,
      });
    }
    console.log(
      JSON.stringify({
        synthetic: true,
        project: "demo-campaign-auth",
        campaign: fixtureCampaign,
        participants: size,
        state: process.argv[3] === "published" ? "published" : "planning",
      }),
    );
  } finally {
    await campaignsAdminDb().terminate();
    await deleteApp(campaignsAdminApp());
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
