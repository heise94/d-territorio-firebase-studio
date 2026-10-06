import { deploymentErrors } from "../src/modules/campaigns/lib/deployment";
const errors = deploymentErrors(process.env);
if (errors.length) {
  console.error(JSON.stringify({ ready: false, missingOrInvalid: errors }));
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify({ ready: true, environment: process.env.CAMPAIGNS_ENV }),
  );
