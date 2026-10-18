// Only the anonymous offline fallback and small icon are needed before installation.
// Immutable JS/CSS is cached on demand by Workbox, never private HTML or API data.
export const campaignPrecacheUrls = new Set(["/campanas-offline.html", "/campanas-icon-192.png"]);
/** @template {{ url: string }} T @param {T[]} entries */
export function essentialCampaignPrecache(entries) {
  return { manifest: entries.filter((entry) => campaignPrecacheUrls.has(entry.url)), warnings: [] };
}
