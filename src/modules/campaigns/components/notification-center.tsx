"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { notificationsPage } from "../server/notification-center";
import { campaignFetch } from "../lib/campaign-fetch";
import { PushSettings } from "./push-settings";
import { Bell, ChevronRight } from "lucide-react";
type Page = Awaited<ReturnType<typeof notificationsPage>>;
const base = "/api/campanas/participant/notifications";
const relativeDate = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 3_600_000) return `Hace ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (diff < 86_400_000) return `Hace ${Math.round(diff / 3_600_000)} h`;
  if (diff < 172_800_000) return "Ayer";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(new Date(value));
};

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
      <div className="flex items-center justify-between gap-3">
        <p className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-500">{page?.unreadCount ?? 0} nuevos</p>
        <button
          className="text-sm font-semibold text-[var(--campaign-primary-strong)]"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Actualizar
        </button>
        <button
          className="text-sm font-semibold text-[var(--campaign-primary-strong)]"
          disabled={busy || !page?.unreadCount}
          onClick={() => void mark({ action: "all" })}
        >
          Marcar leídos
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error} La información mostrada no se ha actualizado.
        </p>
      )}
      {!page && <p>Cargando avisos…</p>}
      {page?.notifications.length === 0 && <p>No tienes avisos todavía.</p>}
      {page?.notifications.filter((n) => !n.readAt).length ? <h2 className="text-2xl font-bold">Recientes</h2> : null}
      {page?.notifications.filter((n) => !n.readAt).map((n) => (
        <article
          key={n.id}
          className={
            "campaign-surface relative space-y-2 " +
            "bg-[var(--campaign-mint)]"
          }
        >
          <span className="absolute left-3 top-7 h-2 w-2 rounded-full bg-[var(--campaign-primary)]" aria-label="No leído" />
          <time className="absolute right-4 top-4 text-sm text-[var(--campaign-muted)]" dateTime={n.createdAt}>{relativeDate(n.createdAt)}</time>
          <h2 className="pl-5 text-xl font-bold">{n.title}</h2>
          <p className="pl-5 text-[var(--campaign-muted)]">{n.body}</p>
          <div className="flex flex-wrap gap-3 pl-5">
            <Link
              href={n.targetRoute}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--campaign-primary-strong)]"
            >
              Revisar <ChevronRight className="h-4 w-4" />
            </Link>
            {!n.readAt && (
              <button
                disabled={busy}
                className="text-sm underline"
                onClick={() => void mark({ action: "one", id: n.id })}
              >
                Marcar como leído
              </button>
            )}
          </div>
        </article>
      ))}
      {page?.notifications.filter((n) => n.readAt).length ? <h2 className="pt-2 text-2xl font-bold">Anteriores</h2> : null}
      {page?.notifications.filter((n) => n.readAt).map((n) => (
        <article key={n.id} className="campaign-surface flex items-start gap-3 py-4"><Bell className="mt-1 h-5 w-5 text-[var(--campaign-muted)]" /><div className="min-w-0 flex-1"><h2 className="font-bold">{n.title}</h2><p className="text-sm text-[var(--campaign-muted)]">{n.body}</p></div><time className="text-xs text-[var(--campaign-muted)]">{relativeDate(n.createdAt)}</time></article>
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
      <PushSettings />
    </div>
  );
}
