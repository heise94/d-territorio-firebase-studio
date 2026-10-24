import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildRelease } from "./src/modules/campaigns/lib/build-release.mjs";
import { essentialCampaignPrecache } from "./src/modules/campaigns/lib/pwa-precache.mjs";

const require = createRequire(import.meta.url);

const isDev = process.env.NODE_ENV !== "production";
const release = buildRelease();

/** @type {import('@ducanh2912/next-pwa').PWAConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: false,
  scope: "/campanas",
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: false,
  disable: isDev,
  cacheOnFrontEndNav: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: false,
    additionalManifestEntries: [
      // Also changes sw.js on EVERY build, even when only application code changes.
      { url: "/campanas-offline.html", revision: release.buildId },
      { url: "/campanas-icon-192.png", revision: createHash("sha256").update(readFileSync(new URL("./public/campanas-icon-192.png", import.meta.url))).digest("hex") },
    ],
    manifestTransforms: [essentialCampaignPrecache],
    runtimeCaching: [
      {
        // FIRST: never apply the participant offline fallback to Admin HTML/RSC/API.
        urlPattern: ({ url }) =>
          url.pathname === "/campanas/admin" ||
          url.pathname.startsWith("/campanas/admin/") ||
          url.pathname === "/api/campanas/admin" ||
          url.pathname.startsWith("/api/campanas/admin/"),
        handler: "NetworkOnly",
      },
      {
        // Never cache participant pages, RSC responses or identity/session API responses.
        urlPattern: ({ url }) =>
          url.pathname === "/campanas" ||
          url.pathname.startsWith("/campanas/") ||
          url.pathname.startsWith("/api/campanas/") ||
          url.pathname.startsWith("/api/internal/campanas/"),
        handler: "NetworkOnly",
        options: {
          plugins: [
            {
              // Keep this self-contained: Workbox serializes callbacks into the worker.
              handlerDidError: ({ request }) =>
                request.mode === "navigate"
                  ? caches
                      .match("/campanas-offline.html", { ignoreSearch: true })
                      .then((response) => response ?? Response.error())
                  : Promise.resolve(Response.error()),
            },
          ],
        },
      },
    ],
  },
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  env: {
    CAMPAIGNS_COMPILED_SHA: release.sha ?? "",
    CAMPAIGNS_COMPILED_SHA_SOURCE: release.source,
    CAMPAIGNS_COMPILED_BUILD_ID: release.buildId,
    CAMPAIGNS_COMPILED_AT: release.builtAt,
  },
  generateBuildId: async () => release.buildId,
  async redirects() {
    if (process.env.CAMPAIGNS_HOST_ROUTING !== "true") return [];
    const origin = new URL(process.env.CAMPAIGNS_APP_ORIGIN ?? "");
    if (
      origin.protocol !== "https:" ||
      origin.origin !== process.env.CAMPAIGNS_APP_ORIGIN
    )
      throw new Error("CAMPAIGNS_APP_ORIGIN must be an explicit HTTPS origin");
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: origin.hostname.replace(/\./g, "\\."),
          },
        ],
        missing: [{ type: "query", key: "adminLogin" }],
        destination: "/campanas",
        permanent: false,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/campanas/admin/campaigns/*/program/pdf": [
      "./src/modules/campaigns/assets/fonts/*",
    ],
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default isDev ? nextConfig : withPWA(nextConfig);
