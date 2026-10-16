import assert from "node:assert/strict";
import { deleteApp } from "firebase-admin/app";
import {
  campaignsAdminApp,
  campaignsAdminDb,
} from "../../src/modules/campaigns/server/firebase-admin";
import { clearPilot, configurePilot, registrationBurst } from "./auth-burst";

async function main() {
  configurePilot();
  process.env.CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT = "30";
  process.env.CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT = "120";
  try {
    for (const count of [40, 80]) {
      await clearPilot();
      const report = await registrationBurst(count);
      const participants = await campaignsAdminDb()
        .collection("participants")
        .get();
      console.log(
        JSON.stringify({
          baseline: true,
          action: "register",
          ...report,
          persisted: participants.size,
        }),
      );
      assert.deepEqual(report.statuses, { 200: 30, 429: count - 30 });
      assert.equal(participants.size, 30);
    }
  } finally {
    await clearPilot();
    await campaignsAdminDb().terminate();
    await deleteApp(campaignsAdminApp());
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
