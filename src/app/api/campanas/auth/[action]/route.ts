import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/modules/campaigns/server/auth/service";
import { globalAuthLimit } from "@/modules/campaigns/server/auth/rate-limits";
import { operationalLog } from "@/modules/campaigns/server/operational-log";
import {
  cookieOptions,
  participantAuth,
  SESSION_COOKIE,
} from "@/modules/campaigns/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actions = new Set(["register", "login", "logout", "change-pin"]);
const response = (body: unknown, status = 200) => {
  operationalLog("participant", status);
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
};
const failure = (error: unknown) =>
  error instanceof AuthError
    ? response({ error: error.message }, error.status)
    : response(
        {
          error:
            "El acceso no está disponible temporalmente. Intenta nuevamente más tarde.",
        },
        503,
      );

/** Do not use client-controlled Forwarded/Host headers as the production origin authority. */
function assertSameOrigin(request: NextRequest) {
  const expected =
    process.env.CAMPAIGNS_APP_ORIGIN ??
    (process.env.NODE_ENV !== "production"
      ? new URL(request.url).origin
      : undefined);
  if (
    !expected ||
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AuthError(403, "Solicitud no permitida.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await context.params;
    if (!actions.has(action)) return response({ error: "No encontrado." }, 404);
    assertSameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new AuthError(400, "Solicitud inválida.");
    // Bound the body even when Content-Length is missing or dishonest.
    const reader = request.body?.getReader();
    if (!reader) throw new AuthError(400, "Solicitud inválida.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        throw new AuthError(413, "Solicitud demasiado grande.");
      }
      chunks.push(value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AuthError(400, "Solicitud inválida.");
    }
    const auth = participantAuth();
    const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
    if (action === "register" || action === "login") {
      // A shared ceiling cannot be bypassed with invented X-Forwarded-For headers.
      // Phone-specific limits below protect each account across all instances/devices.
      await auth.limit(`public-${action}`, "shared", globalAuthLimit(action));
      const result =
        action === "register"
          ? await auth.register(input)
          : await auth.login(input);
      // Switching identities also revokes the old device session, without altering admin auth.
      if (token) await auth.logout(token);
      const reply = response({ participant: result.participant });
      reply.cookies.set(SESSION_COOKIE, result.token, cookieOptions());
      return reply;
    }
    if (action === "change-pin") await auth.changePin(token, input);
    else await auth.logout(token);
    const reply = response({ ok: true });
    reply.cookies.set(SESSION_COOKIE, "", {
      ...cookieOptions(new Date(0)),
      maxAge: 0,
    });
    return reply;
  } catch (error) {
    return failure(error);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await context.params;
    if (action === "congregations")
      return response({
        congregations: await participantAuth().congregations(),
      });
    if (action !== "session") return response({ error: "No encontrado." }, 404);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const current = token ? await participantAuth().current(token, true) : null;
    if (!current) {
      const reply = response(
        { error: "Tu sesión venció. Ingresa nuevamente." },
        401,
      );
      reply.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(new Date(0)),
        maxAge: 0,
      });
      return reply;
    }
    const reply = response({ participant: current.participant });
    reply.cookies.set(
      SESSION_COOKIE,
      token!,
      cookieOptions(new Date(current.expiresAt)),
    );
    return reply;
  } catch (error) {
    return failure(error);
  }
}
