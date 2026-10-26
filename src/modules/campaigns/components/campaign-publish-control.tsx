"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ProgramIssue, ProgramView } from "../domain/program";
import { campaignFetch } from "../lib/campaign-fetch";

const button = "rounded-xl border border-teal-800 px-4 py-2.5 font-semibold text-teal-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-700";

function IssueList({ title, items }: { title: string; items: ProgramIssue[] }) {
  if (!items.length) return null;
  return <details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
    <summary className="cursor-pointer font-bold">{title} ({items.length})</summary>
    <ul className="mt-2 max-h-48 space-y-1 overflow-auto pl-5">
      {items.map((issue, index) => <li key={`${issue.code}-${issue.entityId}-${index}`} className="list-disc">
        {issue.message}{[issue.date, issue.hours, issue.point, issue.person].filter(Boolean).length > 0 && <span className="font-semibold"> { [issue.date, issue.hours, issue.point, issue.person].filter(Boolean).join(" · ")}</span>}
      </li>)}
    </ul>
  </details>;
}

export function CampaignPublishControl({ campaignId, refreshKey = "" }: { campaignId: string; refreshKey?: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<ProgramView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const loadedRevision = useRef<string | null>(null);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!user) { setView(null); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await campaignFetch(`${base}/program`, {
        headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
        cache: "no-store",
        signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo revisar el programa.");
      if (!signal?.aborted) {
        const nextRevision = body.update?.plannerRevision ?? body.plannerRevision ?? null;
        if (loadedRevision.current !== nextRevision) setConfirmed(false);
        loadedRevision.current = nextRevision;
        setView(body); setError("");
      }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "No se pudo revisar el programa.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user, base]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh, refreshKey]);

  const isDraft = view?.mode === "draft";
  const preview = isDraft ? view : view?.update;
  const blockers = preview?.blockingErrors ?? [];
  const warnings = preview?.warnings ?? [];
  const revision = isDraft ? view?.plannerRevision : view?.update?.plannerRevision;
  const hasChanges = isDraft || view?.update?.hasChanges === true;
  const hasIssues = blockers.length > 0 || warnings.length > 0;
  const actionLabel = isDraft ? "Publicar programa" : "Publicar nueva versión";

  async function publish() {
    if (!user || !revision) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await campaignFetch(`${base}/publish`, {
        method: "POST", cache: "no-store",
        headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expectedPlannerRevision: revision, confirmWarnings: confirmed, confirmBlockingErrors: confirmed }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo publicar el programa.");
      setDialog(false); setConfirmed(false); setMessage("Programa publicado. La nueva versión ya está disponible para los participantes.");
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo publicar el programa.");
      setDialog(false);
      await refresh();
    } finally { setBusy(false); }
  }

  async function downloadPdf() {
    if (!user) return;
    setBusy(true); setError("");
    try {
      const response = await campaignFetch(`${base}/program/pdf`, { headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "No se pudo descargar el PDF.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "campana.pdf"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo descargar el PDF."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Publicación del programa">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-950">Publicar programa</h2><p className="text-sm text-slate-600">Publica la planificación actual para que los participantes puedan consultarla.</p></div>
      <div className="flex flex-wrap gap-2">
        {view?.mode === "published" && <button type="button" className={button} disabled={busy || loading} onClick={() => void downloadPdf()}>Descargar PDF</button>}
        <button type="button" className="rounded-xl bg-teal-800 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!view || loading || busy || !hasChanges || view.campaignStatus === "completed" || (hasIssues && !confirmed)} onClick={() => setDialog(true)}>
          {loading ? "Revisando…" : actionLabel}
        </button>
      </div>
    </div>
    {view && <p className="text-sm text-slate-600">{view.assignmentCount} asignaciones · {isDraft ? "Primera publicación" : hasChanges ? `Cambios listos para publicar · versión actual v${view.version}` : `Versión actual v${view.version} · sin cambios pendientes`}</p>}
    {blockers.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">Hay observaciones en la planificación. Puedes publicar igualmente después de revisarlas y confirmarlo.</p>}
    <IssueList title="Observaciones de planificación" items={blockers} />
    <IssueList title="Advertencias" items={warnings} />
    {hasIssues && <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
      <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-800" />
      Revisé las observaciones y confirmo publicar esta versión igualmente.
    </label>}
    {view?.campaignStatus === "completed" && <p className="text-sm text-slate-600">La campaña está finalizada y no admite nuevas publicaciones.</p>}
    {message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <AlertDialog open={dialog} onOpenChange={(open) => { if (!busy) setDialog(open); }}>
      <AlertDialogContent>
        <AlertDialogTitle>{actionLabel}</AlertDialogTitle>
        <AlertDialogDescription>
          {hasIssues ? `Se publicará aunque existan ${blockers.length} observaciones y ${warnings.length} advertencias. Los participantes podrán ver esta versión.` : "Se guardará una nueva versión del programa para los participantes."}
        </AlertDialogDescription>
        <div className="flex justify-end gap-3"><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><button type="button" className="rounded-xl bg-teal-800 px-4 py-2.5 font-bold text-white disabled:opacity-50" disabled={busy} onClick={() => void publish()}>{busy ? "Publicando…" : "Confirmar publicación"}</button></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
