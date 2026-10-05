import "server-only";
import { createHmac, createCipheriv, createDecipheriv } from "node:crypto";
import type { ProgramVersion } from "../domain/program";
import { AuthError } from "./auth/service";

const locatorKey = () => {
  const secret = process.env.CAMPAIGNS_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new AuthError(503, "Servicio no disponible.");
  return createHmac("sha256", secret)
    .update("campaign-turn-locator-v1")
    .digest();
};
/** Authenticated opaque locator, not authority. Stable per immutable version/turn.
 * Nonce is keyed to the unique plaintext (same tuple always means same plaintext).
 * IDs cannot be recovered by merely decoding base64. Ownership is revalidated.
 */
export function turnId(version: ProgramVersion, assignmentId: string) {
  const value = JSON.stringify([version.campaignId, version.id, assignmentId]);
  const key = locatorKey();
  const iv = createHmac("sha256", key).update(value).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("campaign-turn-locator-v1"));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}
export function decodeTurn(value: string): [string, string, string] {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      locatorKey(),
      bytes.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from("campaign-turn-locator-v1"));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const ids = JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (
      !Array.isArray(ids) ||
      ids.length !== 3 ||
      ids.some(
        (id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(id),
      )
    )
      throw new Error();
    return ids as [string, string, string];
  } catch {
    throw new AuthError(400, "Turno inválido. Actualiza tu programa.");
  }
}
