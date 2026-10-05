"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import { useCallback, useEffect, useState } from "react";
import {
  changeReasonLabels,
  changeStatusLabels,
} from "../domain/change-request";
import type { participantChanges } from "../server/change-request-participant";
import type { participantNotifications } from "../server/change-notifications";

const button =
  "min-h-12 rounded-xl border border-teal-800 px-4 py-3 font-semibold text-teal-900 disabled:opacity-50";
export function RequestChange({
  turnId,
  onSent,
}: {
  turnId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [reason, setReason] = useState("cannot_attend"),
    [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
      {!open ? (
        <button className={button} onClick={() => setOpen(true)}>
          Solicitar cambio
        </button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await campaignFetch(
                "/api/campanas/participant/change-requests",
                {
                  method: "POST",
                  cache: "no-store",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ turnId, reasonCode: reason, comment }),
                },
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setOpen(false);
              setComment("");
              onSent();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo enviar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            Motivo
            <select
              className="mt-1 block min-h-12 w-full rounded-lg border p-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {Object.entries(changeReasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Comentario opcional
            <textarea
              maxLength={500}
              className="mt-1 block w-full rounded-lg border p-3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <p>No necesitas incluir información médica o privada.</p>
          <p className="text-sm">
            Solicitar un cambio no modifica tu turno. La organización debe
            revisarlo y resolverlo.
          </p>
          <div className="flex gap-3">
            <button className={button} disabled={busy}>
              Enviar solicitud
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
export function ParticipantChangeHistory({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<
      Awaited<ReturnType<typeof participantChanges>>
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await campaignFetch(
          "/api/campanas/participant/change-requests",
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) {
          setRows([]);
          throw new Error(data.error);
        }
        setRows(data);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo actualizar.");
      }
    };
    void load();
    const timer = setInterval(() => void load(), 12000);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refreshKey]);
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Mis solicitudes de cambio</h2>
      {error && <p role="alert">{error}</p>}
      {!rows.length && !error && <p>No tienes solicitudes de cambio.</p>}
      {rows.map((row) => (
        <article key={row.id} className="space-y-2 rounded-xl border p-4">
          <h3 className="font-bold">{row.campaign}</h3>
          <p>
            {row.turn.date} · {row.turn.startTime}–{row.turn.endTime} ·{" "}
            {row.turn.pointName}
          </p>
          <p className="font-semibold">{changeStatusLabels[row.status]}</p>
          <p>{changeReasonLabels[row.reasonCode]}</p>
          {row.comment && <p>{row.comment}</p>}
          {row.organizerResponse && <p>Respuesta: {row.organizerResponse}</p>}
          <p className="text-sm">
            Enviada: {new Date(row.createdAt).toLocaleString("es-CL")}
          </p>
          {row.resolvedAt && (
            <p className="text-sm">
              Resuelta: {new Date(row.resolvedAt).toLocaleString("es-CL")}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
export function ChangeAlerts() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof participantNotifications>>
  >([]);
  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await campaignFetch(
        "/api/campanas/participant/change-notifications",
        { cache: "no-store" },
      );
      setRows(response.ok ? await response.json() : []);
    } catch {
      /* Keep existing verified notices during a temporary network failure. */
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 12000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);
  if (!rows.length) return null;
  return (
    <aside
      aria-label="Avisos de cambios"
      className="space-y-3 rounded-xl border border-amber-700 bg-amber-50 p-4"
    >
      {rows.map((row) => (
        <div key={row.id}>
          <p className="font-bold">{row.title}</p>
          <p>{row.body}</p>
          <a
            className="inline-flex min-h-12 items-center font-semibold text-teal-800 underline"
            href={row.targetRoute}
          >
            Revisar Mi programa
          </a>
        </div>
      ))}
    </aside>
  );
}
