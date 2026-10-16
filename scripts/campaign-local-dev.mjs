import { spawn } from "node:child_process";

// Synthetic local configuration; no cloud project, credentials or secrets.
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--port", "3000"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CAMPAIGNS_ENV: "",
      FIREBASE_ADMIN_CLIENT_EMAIL: "",
      FIREBASE_ADMIN_PRIVATE_KEY: "",
      FIREBASE_ADMIN_PROJECT_ID: "demo-campaign-auth",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8088",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      CAMPAIGNS_AUTH_SECRET: "local-privacy-test-secret-never-production",
      CAMPAIGNS_APP_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_API_KEY: "local-fixture-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-campaign-auth.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-campaign-auth",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-campaign-auth.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:localfixture",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
