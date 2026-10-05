import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./auth/service";
import { SESSION_COOKIE, participantAuth } from "./auth/session";
import { campaignsAdminDb } from "./firebase-admin";
import { CampaignRegistrationService } from "./registration-service";
import { operationalLog } from "./operational-log";

export const registrationService = () =>
  new CampaignRegistrationService(campaignsAdminDb(), participantAuth());
export const participantToken = (request: NextRequest) =>
  request.cookies.get(SESSION_COOKIE)?.value ?? "";
export const privateResponse = (body: unknown, status = 200) => {
  operationalLog("participant", status);
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
};
export const participantFailure = (error: unknown) =>
  error instanceof AuthError
    ? privateResponse({ error: error.message }, error.status)
    : privateResponse(
        { error: "No pudimos conectar. Intenta nuevamente más tarde." },
        503,
      );
export async function registrationBody(request: NextRequest): Promise<unknown> {
  const expected =
    process.env.CAMPAIGNS_APP_ORIGIN ??
    (process.env.NODE_ENV !== "production"
      ? new URL(request.url).origin
      : undefined);
  if (
    !expected ||
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthError(403, "Solicitud no permitida.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AuthError(400, "Solicitud inválida.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, "Solicitud inválida.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 64 * 1024) {
      await reader.cancel();
      throw new AuthError(413, "Solicitud demasiado grande.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthError(400, "Solicitud inválida.");
  }
}
