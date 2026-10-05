import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const isDev = process.env.NODE_ENV !== "production";

/** @type {import('@ducanh2912/next-pwa').PWAConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: false,
  disable: isDev,
  cacheOnFrontEndNav: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: false,
    runtimeCaching: [
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
