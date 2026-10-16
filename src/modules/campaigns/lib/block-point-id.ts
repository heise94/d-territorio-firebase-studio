/**
 * Computes the unique deterministic ID for a (timeBlockId, pointId) association.
 * Uses SHA-256 over JSON.stringify([timeBlockId, pointId]), identically in Node.js
 * and in modern browsers.
 */
export async function computeBlockPointId(
  timeBlockId: string,
  pointId: string,
): Promise<string> {
  const payload = JSON.stringify([timeBlockId, pointId]);
  if (typeof window === "undefined") {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(payload).digest("hex");
  }
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
