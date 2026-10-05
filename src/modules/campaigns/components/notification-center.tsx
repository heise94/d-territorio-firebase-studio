"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { notificationsPage } from "../server/notification-center";
import { campaignFetch } from "../lib/campaign-fetch";
import { PushSettings } from "./push-settings";
type Page = Awaited<ReturnType<typeof notificationsPage>>;
const base = "/api/campanas/participant/notifications";

export function NotificationSummary() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (document.visibilityState === "visible")
        void campaignFetch(base + "?limit=1")
          .then(async (r) => {
            if (!r.ok) throw new Error();
            const page: Page = await r.json();
            if (live) setCount(page.unreadCount);
          })
          .catch(() => {
            if (live) setCount(null);
          });
    };
    refresh();
    const timer = setInterval(refresh, 15_000);
    window.addEventListener("campanas-notification", refresh);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("campanas-notification", refresh);
    };
  }, []);
  return (
    <Link
      href="/campanas/avisos"
      prefetch={false}
      className="block min-h-12 rounded-xl border border-teal-700 bg-teal-50 p-4 font-semibold"
    >
      {count === null
        ? "Revisar mis avisos"
        : count
          ? count === 1
            ? "Tienes 1 aviso nuevo"
            : `Tienes ${count} avisos nuevos`
          : "No tienes avisos nuevos"}
    </Link>
  );
}
export function NotificationCenter() {
  const [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async (cursor?: string) => {
    setBusy(true);
    try {
      const response = await campaignFetch(
        base + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPage((previous) =>
        cursor && previous
          ? {
              ...data,
              notifications: [
                ...previous.notifications,
                ...data.notifications,
              ].filter(
                (n, i, all) => all.findIndex((x) => x.id === n.id) === i,
              ),
            }
          : data,
      );
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos actualizar los avisos.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("campanas-notification", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("campanas-notification", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  async function mark(
    input: { action: "all" } | { action: "one"; id: string },
  ) {
    setBusy(true);
    try {
      const response = await campaignFetch(base + "/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      await refresh();
      window.dispatchEvent(new Event("campanas-notification"));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo marcar como leído.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <PushSettings />
      <div className="flex flex-wrap gap-3">
        <button
          className="min-h-12 rounded-xl border px-4 font-semibold"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Actualizar avisos
        </button>
        <button
          className="min-h-12 rounded-xl border px-4 font-semibold"
          disabled={busy || !page?.unreadCount}
          onClick={() => void mark({ action: "all" })}
        >
          Marcar todos como leídos
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error} La información mostrada no se ha actualizado.
        </p>
      )}
      {page ? (
        <p>{page.unreadCount} avisos no leídos</p>
      ) : (
        <p>Cargando avisos…</p>
      )}
      {page?.notifications.length === 0 && <p>No tienes avisos todavía.</p>}
      {page?.notifications.map((n) => (
        <article
          key={n.id}
          className={
            "space-y-3 rounded-2xl border p-5 " +
            (n.readAt ? "bg-white" : "border-teal-700 bg-teal-50")
          }
        >
          <p className="font-semibold">{n.readAt ? "Leído" : "No leído"}</p>
          <h2 className="text-xl font-bold">{n.title}</h2>
          <p>{n.body}</p>
          <time dateTime={n.createdAt}>
            {new Date(n.createdAt).toLocaleString("es-CL")}
          </time>
          <div className="flex flex-wrap gap-3">
            <Link
              href={n.targetRoute}
              prefetch={false}
              className="inline-flex min-h-12 items-center font-semibold text-teal-800 underline"
            >
              Revisar en la aplicación
            </Link>
            {!n.readAt && (
              <button
                disabled={busy}
                className="min-h-12 rounded-xl border px-4"
                onClick={() => void mark({ action: "one", id: n.id })}
              >
                Marcar como leído
              </button>
            )}
          </div>
        </article>
      ))}
      {page?.nextCursor && (
        <button
          disabled={busy}
          className="min-h-12 rounded-xl border px-5"
          onClick={() => void refresh(page.nextCursor!)}
        >
          Ver más avisos
        </button>
      )}
    </div>
  );
}
