"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PairInboxGroup } from "../domain/pair-request";

export function PairInbox({ expanded = false }: { expanded?: boolean }) {
  const [groups, setGroups] = useState<PairInboxGroup[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const reply = await campaignFetch(
          "/api/campanas/participant/pair-inbox",
          {
            cache: "no-store",
          },
        );
        const data = await reply.json();
        if (!reply.ok) throw new Error(data.error);
        if (!disposed) {
          setGroups(data.groups);
          setError("");
        }
      } catch {
        if (!disposed)
          setError(
            "No pudimos actualizar tus solicitudes pendientes. Intenta recargar.",
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  if (loading) return <p role="status">Revisando solicitudes pendientes…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!groups.length)
    return expanded ? <p>No tienes solicitudes pendientes recibidas.</p> : null;
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  return (
    <section
      aria-label="Solicitudes pendientes recibidas"
      className="space-y-4 rounded-2xl border-2 border-teal-700 bg-teal-50 p-5"
    >
      <h2 className="text-xl font-bold">
        {total === 1
          ? "Solicitud pendiente"
          : `${total} solicitudes pendientes`}
      </h2>
      {(expanded ? groups : groups.slice(0, 3)).map((group) => (
        <div key={group.campaignId} className="space-y-2">
          <p className="font-semibold">{group.campaignName}</p>
          <p>
            {group.senderNames.join(" y ")}{" "}
            {group.count === 1
              ? "desea participar contigo"
              : "desean participar contigo"}
            .{group.count > 2 && ` Hay ${group.count} solicitudes por revisar.`}
          </p>
          <Link
            prefetch={false}
            href={`/campanas/participar-juntos/${group.campaignId}`}
            className="flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white"
          >
            Revisar y responder
          </Link>
        </div>
      ))}
      {!expanded && groups.length > 3 && (
        <Link
          prefetch={false}
          href="/campanas/participar-juntos"
          className="inline-flex min-h-12 items-center underline"
        >
          Ver todas las solicitudes
        </Link>
      )}
    </section>
  );
}
