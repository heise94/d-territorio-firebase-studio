"use client";

import { campaignStatusLabels } from "../lib/presentation";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  AdminOverview,
  AdminParticipantDetail,
  AdminParticipantList,
} from "../domain/admin-dashboard";
import type { AdminParticipantFilters } from "../schemas/admin-dashboard-schemas";
import {
  DashboardParticipants,
  dashboardButton,
} from "./admin-dashboard-participants";
import { DashboardDetail } from "./admin-dashboard-detail";
import { formatHumanDate } from "./campaign-schedule-settings";

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
  const response = await campaignFetch(url, {
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

  const hasActiveFilters = Boolean(
    (filters.q && filters.q.trim().length > 0) ||
      filters.congregationId ||
      filters.dayId ||
      filters.blockId,
  );

  const selectedCongregation = overview?.congregations.find(
    (c) => c.id === filters.congregationId,
  );
  const selectedDay = overview?.days.find((d) => d.id === filters.dayId);
  const selectedBlock = overview?.days
    .flatMap((d) => d.blocks)
    .find((b) => b.id === filters.blockId);
  const searchQuery = filters.q?.trim();

  const count = list?.total ?? 0;
  const globalTotal = overview?.metrics.activeRegistrations ?? count;

  let counterTitle = `${globalTotal} participantes`;
  let counterSubtitle = "Total de hermanos inscritos en esta campaña";

  if (searchQuery) {
    const scopeTotal = selectedCongregation?.participantCount ?? globalTotal;
    counterTitle = `${count} de ${scopeTotal} ${count === 1 ? "participante" : "participantes"}`;
    counterSubtitle = `Coincidencias para «${searchQuery}»${
      selectedCongregation ? ` en ${selectedCongregation.name}` : ""
    }`;
  } else if (selectedCongregation && (selectedBlock || selectedDay)) {
    const congTotal = selectedCongregation.participantCount ?? count;
    counterTitle = `${count} de ${congTotal} ${count === 1 ? "participante" : "participantes"}`;
    const periodDesc = selectedBlock
      ? `en horario ${selectedBlock.startTime}–${selectedBlock.endTime}`
      : selectedDay
        ? `el ${formatHumanDate(selectedDay.date)}`
        : "";
    counterSubtitle = `Hermanos de ${selectedCongregation.name} disponibles ${periodDesc}`;
  } else if (selectedCongregation) {
    counterTitle = `${count} ${count === 1 ? "participante" : "participantes"}`;
    counterSubtitle = `Total de hermanos inscritos de la congregación ${selectedCongregation.name}`;
  } else if (selectedBlock) {
    counterTitle = `${count} ${count === 1 ? "participante" : "participantes"}`;
    counterSubtitle = `Total de hermanos disponibles en horario ${selectedBlock.startTime}–${selectedBlock.endTime}`;
  } else if (selectedDay) {
    counterTitle = `${count} ${count === 1 ? "participante" : "participantes"}`;
    counterSubtitle = `Total de hermanos disponibles el ${formatHumanDate(selectedDay.date)}`;
  }

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
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Participantes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta y administra los hermanos inscritos en esta campaña.
          </p>
          {overview && (
            <p className="mt-1 text-xs text-slate-500">
              {overview.campaign.name}
              {overview.campaign.locationName
                ? ` · ${overview.campaign.locationName}`
                : ""}
            </p>
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

      {/* Contador principal dinámico según filtros */}
      {overview && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {counterTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {counterSubtitle}
            </p>
          </div>
        </div>
      )}

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
      )}

      <DashboardDetail
        open={!!selected}
        detail={detail}
        overview={overview}
        campaignId={campaignId}
        loading={detailLoading}
        error={detailError}
        onClose={() => {
          setSelected(null);
          setDetail(null);
          setDetailError("");
        }}
        onSaved={() => {
          void refresh();
        }}
      />
    </main>
  );
}
