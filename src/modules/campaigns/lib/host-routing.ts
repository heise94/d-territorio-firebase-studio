/** Root-only routing, not an authentication or origin/CSRF trust decision.
 * App Hosting forwards the public host while Host identifies its Cloud Run backend.
 * Both must match deployment-controlled exact allowlists. Never construct a URL
 * from a request header, accept a host suffix, or trust forwarded headers alone.
 */
export function campaignsRootDestination(
  request: { pathname: string; search: string; host: string | null; forwardedHost: string | null },
  env: Record<string, string | undefined>,
): string | null {
  if (env.CAMPAIGNS_HOST_ROUTING !== "true" || request.pathname !== "/") return null;
  if (new URLSearchParams(request.search).has("adminLogin")) return null;
  let origin: URL;
  try { origin = new URL(env.CAMPAIGNS_APP_ORIGIN ?? ""); } catch { return null; }
  if (origin.protocol !== "https:" || origin.origin !== env.CAMPAIGNS_APP_ORIGIN) return null;
  const backendHosts = (env.CAMPAIGNS_ROUTING_BACKEND_HOSTS ?? "").split(",").filter(Boolean);
  const publicHost = request.host === origin.host;
  const knownProxy = backendHosts.includes(request.host ?? "") && request.forwardedHost === origin.host;
  if (!publicHost && !knownProxy) return null;
  return new URL("/campanas", origin).href;
}
