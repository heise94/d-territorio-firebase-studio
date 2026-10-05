"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type { ProgramIssue, ProgramView } from "../domain/program";
import { ProgramMatrix } from "./program-matrix";
import styles from "./program.module.css";
import "./program-print.css";
import { ChangeRequestsLink } from "./campaign-changes";
import type { programHistory } from "../server/program-history";
const button =
  "rounded-xl border border-teal-800 px-4 py-3 font-semibold text-teal-900 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-700";
function Issues({ title, items }: { title: string; items: ProgramIssue[] }) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-bold">
        {title}: {items.length}
      </h2>
      <ul className="mt-2 space-y-2">
        {items.map((issue, index) => (
          <li key={index}>
            {issue.message}{" "}
            <span className="font-semibold">
              {[issue.date, issue.hours, issue.point, issue.person]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function CampaignProgram({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<ProgramView | null>(null);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [history, setHistory] = useState<Awaited<
    ReturnType<typeof programHistory>
  > | null>(null);
  const versionQuery = selectedVersion ? `?version=${selectedVersion}` : "";
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const pause = useRef(false),
    request = useRef<AbortController | null>(null);
  const previewRevision = useRef<string | null>(null);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (!user) {
      setView(null);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`${base}/program${versionQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setView(null);
        throw new Error(data.error);
      }
      if (!controller.signal.aborted) {
        if (previewRevision.current !== data.plannerRevision)
          setConfirmed(false);
        previewRevision.current = data.plannerRevision;
        setView(data);
        if (data.mode === "published") {
          const response = await campaignFetch(`${base}/program/versions`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.ok) setHistory(await response.json());
        }
        setError("");
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [user, base, versionQuery]);
  useEffect(() => {
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible" && !pause.current)
        void refresh();
    };
    const interval = setInterval(update, 12000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
      request.current?.abort();
    };
  }, [refresh]);
  async function publish() {
    if (!user || !view) return;
    setBusy(true);
    setError("");
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`${base}/publish`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedPlannerRevision: view.plannerRevision,
          confirmWarnings: confirmed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setView(data);
      setDialog(false);
      setConfirmed(false);
      pause.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar.");
      setDialog(false);
      setConfirmed(false);
      pause.current = false;
      // Preserve the conflict message while refreshing the stale preview.
      const message = e instanceof Error ? e.message : "No se pudo publicar.";
      await refresh();
      setError(message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(
        `${base}/program/pdf${versionQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error((await response.json()).error);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download =
        /filename="([^"]+)"/.exec(
          response.headers.get("content-disposition") ?? "",
        )?.[1] ?? "campana.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="campaign-program-main mx-auto max-w-[1800px] space-y-5 p-4 sm:p-6">
      <div className={styles.noPrint}>
        <Link
          href={`/campanas/admin/planificar/${campaignId}`}
          className="text-teal-800"
        >
          ← Planificador manual
        </Link>
        <h1 className="my-3 text-2xl font-bold">Programa general</h1>
        {view?.mode === "published" && (
          <div className="my-4 space-y-3">
            <ChangeRequestsLink campaignId={campaignId} />
            <p className="font-semibold">
              Versión actual: v{history?.currentVersion ?? view.version}
            </p>
            <label>
              Consultar versión
              <select
                className="ml-3 min-h-12 rounded-lg border p-2"
                value={selectedVersion}
                disabled={busy}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedVersion(e.target.value);
                }}
              >
                <option value="">Actual</option>
                {history?.versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version}
                    {v.current ? " — actual" : " — histórica"}
                  </option>
                ))}
              </select>
            </label>
            {selectedVersion &&
              Number(selectedVersion) !== history?.currentVersion && (
                <p className="font-bold text-amber-900">
                  {loading
                    ? "Cargando versión histórica…"
                    : `VERSIÓN HISTÓRICA — v${view.version} · Solo lectura`}
                </p>
              )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            onClick={() => void refresh()}
            disabled={loading || busy}
          >
            Actualizar
          </button>
          <button
            className={button}
            onClick={() => window.print()}
            disabled={!view || busy || loading}
          >
            Imprimir
          </button>
          <button
            className={button}
            onClick={() => void download()}
            disabled={!view || busy || loading}
          >
            Descargar PDF
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-red-800">
            {error}
          </p>
        )}
        {!view && (
          <p role="status">
            {loading
              ? "Cargando programa…"
              : "Ingresa con una cuenta administrativa autorizada."}
          </p>
        )}
        {view && (
          <div className="mt-5 space-y-4">
            <p>
              {view.assignmentCount} asignaciones ·{" "}
              {view.mode === "draft"
                ? "Vista actualizada cada 12 segundos mientras esté visible."
                : "Versión oficial inmutable."}
            </p>
            <Issues
              title="Errores que bloquean publicación"
              items={view.blockingErrors}
            />
            <Issues title="Advertencias" items={view.warnings} />
            {view.mode === "draft" && (
              <>
                {view.warnings.length > 0 && (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    He revisado las advertencias y deseo publicar de todas
                    formas.
                  </label>
                )}
                <button
                  className={button}
                  disabled={
                    busy ||
                    view.campaignStatus !== "planning" ||
                    !!view.blockingErrors.length ||
                    (!!view.warnings.length && !confirmed)
                  }
                  onClick={() => {
                    request.current?.abort();
                    pause.current = true;
                    setDialog(true);
                  }}
                >
                  Publicar programa
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {view && <ProgramMatrix view={view} />}
      <AlertDialog
        open={dialog}
        onOpenChange={(open) => {
          if (!busy) {
            setDialog(open);
            pause.current = open;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Publicar programa oficial v1</AlertDialogTitle>
          <AlertDialogDescription>
            Se guardará una versión inmutable del programa. Los participantes
            verán sus turnos y el planificador quedará en solo lectura. Esta
            acción no puede deshacerse en Fase 7.
          </AlertDialogDescription>
          {view?.warnings.length ? (
            <p>{view.warnings.length} advertencias revisadas y confirmadas.</p>
          ) : null}
          <div className="flex justify-end gap-3">
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <button
              className={button}
              disabled={busy}
              onClick={() => void publish()}
            >
              {busy ? "Publicando…" : "Confirmar publicación v1"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
