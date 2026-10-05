"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  AdminOverview,
  AdminParticipantDetail,
  AdminParticipantList,
} from "../domain/admin-dashboard";
import type { AdminParticipantFilters } from "../schemas/admin-dashboard-schemas";
import { DashboardCoverage } from "./admin-dashboard-coverage";
import {
  DashboardParticipants,
  dashboardButton,
} from "./admin-dashboard-participants";
import { DashboardDetail } from "./admin-dashboard-detail";

class DashboardError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function consult<T>(
  url: string,
  token: string,
  signal: AbortSignal,
  search = "",
): Promise<T> {
  // Keep names/phones out of URLs and normal HTTP access logs.
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(search ? { "X-Campaign-Search": encodeURIComponent(search) } : {}),
    },
    cache: "no-store",
    signal,
  });
  const body = await response.json();
  if (!response.ok)
    throw new DashboardError(
      body.error ?? "No se pudo actualizar el panel.",
      response.status,
    );
  return body as T;
}
export function CampaignAdminDashboard({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [list, setList] = useState<AdminParticipantList | null>(null);
  const [filters, setFilters] = useState<AdminParticipantFilters>({
    q: "",
    status: "active",
    link: "all",
    page: 1,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminParticipantDetail | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    if (!user) {
      setOverview(null);
      setList(null);
      setDetail(null);
      setSelected(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDetailLoading(!!selected);
    try {
      // Fresh existing Firebase Auth credential; never a participant cookie or stored token.
      const token = await user.getIdToken(true);
      if (controller.signal.aborted) return;
      const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (key !== "q" && value !== undefined && value !== "")
          query.set(key, String(value));
      });
      const detailRequest = selected
        ? consult<AdminParticipantDetail>(
            `${base}/participants/${encodeURIComponent(selected)}`,
            token,
            controller.signal,
          ).catch((failure: unknown) => {
            if (
              failure instanceof DashboardError &&
              [401, 403].includes(failure.status)
            )
              throw failure;
            if (!controller.signal.aborted) {
              setDetail(null);
              setDetailError(
                failure instanceof Error
                  ? failure.message
                  : "No se pudo consultar la ficha.",
              );
            }
            return null;
          })
        : Promise.resolve(null);
      const [nextOverview, nextList, nextDetail] = await Promise.all([
        consult<AdminOverview>(`${base}/overview`, token, controller.signal),
        consult<AdminParticipantList>(
          `${base}/participants?${query}`,
          token,
          controller.signal,
          filters.q,
        ),
        detailRequest,
      ]);
      if (controller.signal.aborted) return;
      setOverview(nextOverview);
      setList(nextList);
      setDetail(nextDetail);
      setError("");
      if (nextDetail) setDetailError("");
    } catch (failure) {
      if (controller.signal.aborted) return;
      const unauthorized =
        failure instanceof DashboardError &&
        [401, 403].includes(failure.status);
      if (unauthorized || !(failure instanceof DashboardError)) {
        // Token refresh failures also remove previously displayed private information.
        setOverview(null);
        setList(null);
        setDetail(null);
        setSelected(null);
      }
      setError(
        failure instanceof DashboardError
          ? failure.message
          : "No se pudo actualizar. Revisa tu sesión e intenta nuevamente.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setDetailLoading(false);
      }
    }
  }, [campaignId, filters, selected, user]);
  useEffect(() => {
    void refresh();
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(visibleRefresh, 30_000);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibleRefresh);
      pending.current?.abort();
    };
  }, [refresh]);
  const applyFilters = (next: AdminParticipantFilters) => {
    setList(null);
    setFilters(next);
  };
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Link
        href="/campanas/admin"
        className="text-sm font-semibold text-teal-800 underline"
      >
        ← Configuración de campañas
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Participantes y cobertura
          </h1>
          {overview && (
            <>
              <h2 className="mt-2 text-xl font-semibold">
                {overview.campaign.name}
              </h2>
              <p>
                {overview.campaign.locationName || "Ubicación por definir"}
                {overview.campaign.locationDetails
                  ? ` · ${overview.campaign.locationDetails}`
                  : ""}
              </p>
              <p className="text-sm">
                Fechas: {overview.campaign.dates.join(", ") || "por definir"} ·
                Estado: <strong>{overview.campaign.status}</strong>
              </p>
            </>
          )}
        </div>
        <button
          className={dashboardButton}
          onClick={() => void refresh()}
          disabled={loading}
        >
          Actualizar
        </button>
      </header>
      <p className="text-sm text-slate-600" role="status">
        {loading
          ? "Actualizando panel…"
          : overview
            ? `Última actualización: ${new Date(overview.updatedAt).toLocaleTimeString("es-CL")}. Se actualiza cada 30 segundos mientras está visible.`
            : "Sin datos disponibles."}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {error}
          {overview
            ? " Los datos visibles corresponden a la última consulta correcta."
            : ""}
        </p>
      )}
      {overview && (
        <>
          <section
            aria-label="Resumen de campaña"
            className="grid grid-cols-2 gap-3 lg:grid-cols-3"
          >
            {[
              ["Inscritos activos", overview.metrics.activeRegistrations],
              [
                "Bloques que necesitan apoyo",
                overview.metrics.needsSupportBlocks,
              ],
              ["Bloques completos", overview.metrics.fullBlocks],
              [
                "Reservas potenciales por bloque",
                overview.metrics.reservePotential,
              ],
              ["Solicitudes pending", overview.metrics.pendingRequests],
              ["Vínculos accepted", overview.metrics.acceptedLinks],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-white p-4">
                <p className="text-sm text-slate-600">{label}</p>
                <p className="text-3xl font-bold">{value}</p>
              </div>
            ))}
          </section>
          {!!overview.metrics.acceptedAvailabilityConflicts && (
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
              {overview.metrics.acceptedAvailabilityConflicts} vínculos accepted
              sin disponibilidad activa en común. Requieren revisión; no se
              disuelven automáticamente.
            </p>
          )}
          <DashboardCoverage
            overview={overview}
            onBlock={(dayId, blockId) =>
              applyFilters({
                ...filters,
                q: "",
                dayId,
                blockId,
                status: "active",
                page: 1,
              })
            }
          />
          <DashboardParticipants
            overview={overview}
            list={list}
            filters={filters}
            loading={loading}
            onFilters={applyFilters}
            onDetail={(id) => {
              setDetail(null);
              setDetailError("");
              setSelected(id);
            }}
          />
        </>
      )}
      <DashboardDetail
        open={!!selected}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        onClose={() => {
          setSelected(null);
          setDetail(null);
          setDetailError("");
        }}
      />
    </main>
  );
}
