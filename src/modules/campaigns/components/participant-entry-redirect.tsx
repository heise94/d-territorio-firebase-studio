"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { campaignFetch } from "../lib/campaign-fetch";

/** Anonymous entry HTML can load from the CDN while session validation runs. */
export function ParticipantEntryRedirect({ destination = "/campanas" }: { destination?: string }) {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void campaignFetch("/api/campanas/auth/session", { signal: controller.signal })
      .then((reply) => { if (reply.ok && !controller.signal.aborted) router.replace(destination); })
      .catch(() => {});
    return () => controller.abort();
  }, [router, destination]);
  return null;
}
