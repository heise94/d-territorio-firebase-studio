"use client";

import { useState, useEffect } from "react";
import { registrationStatusLabel, pairStatusLabels } from "../lib/presentation";
import type {
  AdminOverview,
  AdminParticipantList,
  AdminParticipantRow,
} from "../domain/admin-dashboard";
import type { AdminParticipantFilters } from "../schemas/admin-dashboard-schemas";
import { formatHumanDate } from "./campaign-schedule-settings";

export const dashboardButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 transition-colors";
export const dashboardInput =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700";

export function LinkSummary({ row }: { row: AdminParticipantRow }) {
  return (
    <div className="space-y-1 text-sm text-slate-600">
      {row.accepted && (
        <p>Vínculo: {row.accepted.otherName}</p>
      )}
      {!!(row.pendingSent + row.pendingReceived) && (
        <p>
          Solicitudes pendientes: {row.pendingSent} enviadas · {row.pendingReceived} recibidas
        </p>
      )}
      {!row.accepted && !(row.pendingSent + row.pendingReceived) && (
        <p>Sin vínculo ni solicitudes de compañero</p>
      )}
    </div>
  );
}

export function DashboardParticipants({
  overview,
  list,
  filters,
  loading,
  onFilters,
  onDetail,
}: {
  overview: AdminOverview;
  list: AdminParticipantList | null;
  filters: AdminParticipantFilters;
  loading: boolean;
  onFilters: (filters: AdminParticipantFilters) => void;
  onDetail: (id: string) => void;
}) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft(filters), [filters]);

  const change = (key: keyof AdminParticipantFilters, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value || undefined }));

  const hasActiveFilters = Boolean(
    (draft.q && draft.q.trim().length > 0) ||
      draft.congregationId ||
      draft.dayId ||
      draft.blockId,
  );

  const handleClear = () => {
    const cleared: AdminParticipantFilters = {
      q: "",
      status: "active",
      link: "all",
      page: 1,
    };
    setDraft(cleared);
    onFilters(cleared);
  };

  return (
    <section
      aria-labelledby="participants-title"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onFilters({
            ...draft,
            q: draft.q?.trim() ?? "",
            page: 1,
          });
        }}
      >
        <div className="lg:col-span-1">
          <label
            htmlFor="filter-search"
            className="block text-xs font-semibold text-slate-600 mb-1"
          >
            Buscar hermano
          </label>
          <input
            id="filter-search"
            className={dashboardInput}
            value={draft.q ?? ""}
            maxLength={120}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            autoComplete="off"
            placeholder="Nombre o teléfono"
          />
        </div>

        <div>
          <label
            htmlFor="filter-congregation"
            className="block text-xs font-semibold text-slate-600 mb-1"
          >
            Congregación
          </label>
          <select
            id="filter-congregation"
            className={dashboardInput}
            value={draft.congregationId ?? ""}
            onChange={(event) => change("congregationId", event.target.value)}
          >
            <option value="">Todas ({overview.metrics.activeRegistrations})</option>
            {overview.congregations.map((congregation) => (
              <option key={congregation.id} value={congregation.id}>
                {congregation.name}
                {typeof congregation.participantCount === "number"
                  ? ` (${congregation.participantCount})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-day"
            className="block text-xs font-semibold text-slate-600 mb-1"
          >
            Día
          </label>
          <select
            id="filter-day"
            className={dashboardInput}
            value={draft.dayId ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                dayId: event.target.value || undefined,
                blockId: undefined,
              })
            }
          >
            <option value="">Todos los días</option>
            {overview.days.map((day) => (
              <option key={day.id} value={day.id}>
                {formatHumanDate(day.date)} {day.label ? `· ${day.label}` : ""}
                {typeof day.availableCount === "number"
                  ? ` (${day.availableCount})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-block"
            className="block text-xs font-semibold text-slate-600 mb-1"
          >
            Horario / bloque
          </label>
          <select
            id="filter-block"
            className={dashboardInput}
            value={draft.blockId ?? ""}
            onChange={(event) => change("blockId", event.target.value)}
          >
            <option value="">Todos los horarios</option>
            {overview.days
              .filter((day) => !draft.dayId || day.id === draft.dayId)
              .flatMap((day) =>
                day.blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {!draft.dayId ? `${formatHumanDate(day.date)}: ` : ""}
                    {block.startTime}–{block.endTime}
                    {block.label ? ` (${block.label})` : ""}
                    {typeof block.coverage.availableCount === "number"
                      ? ` (${block.coverage.availableCount} disp.)`
                      : ""}
                  </option>
                )),
              )}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" className={dashboardButton} disabled={loading}>
            Buscar
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={handleClear}
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {loading && !list && (
        <p className="py-6 text-center text-sm text-slate-500" role="status">
          Consultando participantes…
        </p>
      )}

      {list && !list.rows.length && !loading && (
        <div className="py-12 text-center text-slate-600">
          <p className="text-base font-medium">
            No hay participantes que coincidan con estos filtros.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={handleClear}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {list && list.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-2.5">
                  Hermano
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Congregación
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.rows.map((row) => (
                <tr
                  key={row.registrationId}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{row.fullName}</span>
                      {!row.profileActive && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-normal">
                          Perfil inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {row.congregation}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center text-sm font-medium text-teal-800 hover:text-teal-900 underline"
                      onClick={() => onDetail(row.registrationId)}
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list && list.total > list.pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            Página {list.page} de {Math.ceil(list.total / list.pageSize)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50"
              disabled={loading || filters.page === 1}
              onClick={() => onFilters({ ...filters, page: filters.page - 1 })}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50"
              disabled={loading || list.page * list.pageSize >= list.total}
              onClick={() => onFilters({ ...filters, page: filters.page + 1 })}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
