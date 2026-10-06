"use client";
import { useEffect, useState } from "react";
import type {
  AdminOverview,
  AdminParticipantList,
  AdminParticipantRow,
} from "../domain/admin-dashboard";
import type { AdminParticipantFilters } from "../schemas/admin-dashboard-schemas";

export const dashboardInput =
  "w-full rounded border border-slate-300 bg-white p-2 text-sm";
export const dashboardButton =
  "rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
export function LinkSummary({ row }: { row: AdminParticipantRow }) {
  return (
    <div className="space-y-1 text-sm">
      {row.accepted && (
        <>
          <p>Vínculo obligatorio: {row.accepted.otherName}</p>
          {row.accepted.availabilityConflict && (
            <p className="font-semibold text-amber-800">
              Conflicto de disponibilidad
            </p>
          )}
          {row.accepted.participationConflict && (
            <p className="text-amber-800">Revisar participación del vínculo</p>
          )}
        </>
      )}
      {!!(row.pendingSent + row.pendingReceived) && (
        <p>
          Pendientes: {row.pendingSent} enviadas · {row.pendingReceived}{" "}
          recibidas
        </p>
      )}
      {!row.accepted && !(row.pendingSent + row.pendingReceived) && (
        <p>Sin vínculo ni solicitudes pendientes</p>
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
  return (
    <section
      aria-labelledby="participants-title"
      className="space-y-4 rounded-xl border bg-white p-4 sm:p-6"
    >
      <h2 id="participants-title" className="text-xl font-bold">
        Participantes inscritos
      </h2>
      <form
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onFilters({ ...draft, q: draft.q ?? "", page: 1 });
        }}
      >
        <label className="text-sm">
          Nombre o teléfono completo
          <input
            className={dashboardInput}
            value={draft.q ?? ""}
            maxLength={120}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            autoComplete="off"
            placeholder="Nombre o móvil chileno"
          />
        </label>
        <label className="text-sm">
          Congregación
          <select
            className={dashboardInput}
            value={draft.congregationId ?? ""}
            onChange={(event) => change("congregationId", event.target.value)}
          >
            <option value="">Todas</option>
            {overview.congregations.map((congregation) => (
              <option key={congregation.id} value={congregation.id}>
                {congregation.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Día
          <select
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
            <option value="">Todos</option>
            {overview.days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.date} {day.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Bloque
          <select
            className={dashboardInput}
            value={draft.blockId ?? ""}
            onChange={(event) => change("blockId", event.target.value)}
          >
            <option value="">Todos</option>
            {overview.days
              .filter((day) => !draft.dayId || day.id === draft.dayId)
              .flatMap((day) =>
                day.blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {day.date} {block.startTime}–{block.endTime} {block.label}
                  </option>
                )),
              )}
          </select>
        </label>
        <label className="text-sm">
          Inscripción
          <select
            className={dashboardInput}
            value={draft.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="active">Activa</option>
            <option value="withdrawn">Retirada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <label className="text-sm">
          Vínculo
          <select
            className={dashboardInput}
            value={draft.link}
            onChange={(event) => change("link", event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="none">Sin vínculo ni pendientes</option>
            <option value="pending">Con solicitudes pendientes</option>
            <option value="accepted">Con vínculo accepted</option>
            <option value="conflict">Conflicto de disponibilidad</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className={dashboardButton} disabled={loading}>
            Aplicar filtros
          </button>
          <button
            className="rounded border px-3 py-2 text-sm"
            type="button"
            onClick={() =>
              onFilters({ q: "", status: "active", link: "all", page: 1 })
            }
          >
            Limpiar
          </button>
        </div>
      </form>
      <p className="text-sm text-slate-600" role="status">
        {loading
          ? "Consultando participantes…"
          : `${list?.total ?? 0} participantes con estos filtros`}
      </p>
      {list && !list.rows.length && !loading && (
        <p>No hay participantes que coincidan con los filtros.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list?.rows.map((row) => (
          <article
            key={row.registrationId}
            className="space-y-2 rounded-lg border p-4"
          >
            <h3 className="font-semibold">{row.fullName}</h3>
            <p className="text-sm">{row.congregation}</p>
            <p className="text-sm">
              Inscripción: {row.registrationStatus} · Máximo de turnos:{" "}
              {row.maxTurns ?? "Sin límite"}
            </p>
            {!row.profileActive && (
              <p className="text-sm text-amber-800">Perfil inactivo</p>
            )}
            <p className="text-sm">
              Bloques disponibles actuales: {row.availableBlockCount}
            </p>
            <LinkSummary row={row} />
            <button
              className="text-sm font-semibold text-teal-800 underline"
              onClick={() => onDetail(row.registrationId)}
            >
              Ver ficha de {row.fullName}
            </button>
          </article>
        ))}
      </div>
      {list && list.total > list.pageSize && (
        <div className="flex items-center gap-3">
          <button
            className="rounded border p-2 disabled:opacity-50"
            disabled={loading || filters.page === 1}
            onClick={() => onFilters({ ...filters, page: filters.page - 1 })}
          >
            Anterior
          </button>
          <span className="text-sm">
            Página {list.page} de {Math.ceil(list.total / list.pageSize)}
          </span>
          <button
            className="rounded border p-2 disabled:opacity-50"
            disabled={loading || list.page * list.pageSize >= list.total}
            onClick={() => onFilters({ ...filters, page: filters.page + 1 })}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}
