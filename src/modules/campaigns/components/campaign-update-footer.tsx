"use client";

import { RefreshCw } from "lucide-react";
import { useCampaignUpdate } from "./campaign-pwa";

export function CampaignUpdateFooter({ label }: { label: string }) {
  const { checkForUpdate, checking, message } = useCampaignUpdate();
  return (
    <footer className="mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4 pb-24 pt-2 text-center text-sm text-[var(--campaign-muted)]">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span>{label}</span>
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-700 px-3 font-semibold text-teal-800" onClick={() => void checkForUpdate()} disabled={checking}>
          <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
          {checking ? "Buscando actualización…" : "Buscar actualización"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </footer>
  );
}
