import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const isSha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);

/** Captured at build time, not inherited from a stale Cloud Run runtime setting. */
/** @param {{ cwd?: string, env?: Record<string, string | undefined>, now?: Date }} [options] */
export function buildRelease({
  cwd = process.cwd(),
  env = process.env,
  now = new Date(),
} = {}) {
  let sha = null;
  let source = "build-id";
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (isSha(head)) {
      sha = head.toLowerCase();
      source = "git";
    }
  } catch {}
  if (!sha) {
    // Source archive builds may carry Google's source context instead of .git.
    try {
      const context = JSON.parse(
        readFileSync(join(cwd, "source-context.json"), "utf8"),
      );
      const revision = context.git?.revisionId;
      if (isSha(revision)) {
        sha = revision.toLowerCase();
        source = "source-context";
      }
    } catch {}
  }
  if (!sha && isSha(env.CAMPAIGNS_RELEASE_SHA)) {
    sha = env.CAMPAIGNS_RELEASE_SHA.toLowerCase();
    source = "build-env";
  }
  // Never use CAMPAIGNS_BUILD_SHA: it was a persistent, manually set runtime value.
  return { sha, source, buildId: randomUUID(), builtAt: now.toISOString() };
}
