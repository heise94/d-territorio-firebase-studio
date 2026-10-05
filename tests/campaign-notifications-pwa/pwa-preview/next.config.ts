// QA-only app: uses the real next-pwa configuration and actual Campañas components.
// It isolates the worker from the two pre-existing Territorios import blockers.
import official from "../../../next.config";
export default {
  ...official,
  experimental: { externalDir: true, cpus: 2 },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3000/api/:path*",
      },
    ];
  },
};
