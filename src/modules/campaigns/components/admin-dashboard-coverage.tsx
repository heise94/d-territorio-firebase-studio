"use client";
import { useState } from "react";
import {
  coverageLabels,
  orderedCoverageDays,
  type AdminOverview,
} from "../domain/admin-dashboard";

const colors = {
  needs_support: "border-amber-500 bg-amber-50",
  medium: "border-blue-300 bg-blue-50",
  near_full: "border-teal-400 bg-teal-50",
  full: "border-green-500 bg-green-50",
  undefined: "border-slate-300 bg-slate-50",
};
export function DashboardCoverage({
  overview,
  onBlock,
}: {
  overview: AdminOverview;
  onBlock: (dayId: string, blockId: string) => void;
}) {
  const [chronological, setChronological] = useState(false);
  return (
    <section
      aria-labelledby="coverage-title"
      className="space-y-4 rounded-xl border bg-white p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="coverage-title" className="text-xl font-bold">
          Cobertura por bloque
        </h2>
        <label className="text-sm">
          Orden{" "}
          <select
            className="ml-2 rounded border p-2"
            value={chronological ? "date" : "deficit"}
            onChange={(event) =>
              setChronological(event.target.value === "date")
            }
          >
            <option value="deficit">Mayor déficit primero</option>
            <option value="date">Cronológico</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-600">
        Disponibilidad declarada, no asignaciones. Reserva potencial = excedente
        por bloque; no identifica personas ni garantiza turnos. Un participante
        puede contar en varios bloques.
      </p>
      {overview.days.length === 0 && <p>No hay días activos configurados.</p>}
      {orderedCoverageDays(overview.days, chronological).map((day) => (
        <div key={day.id} className="space-y-2">
          <h3 className="font-semibold">
            {day.date}
            {day.label ? ` · ${day.label}` : ""}
          </h3>
          {!day.blocks.length && (
            <p className="text-sm text-slate-600">Sin bloques activos.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {day.blocks.map((block) => (
              <button
                key={block.id}
                onClick={() => onBlock(day.id, block.id)}
                className={`rounded-lg border-l-4 p-4 text-left ${colors[block.state]}`}
                aria-label={`Ver participantes de ${day.date} ${block.startTime}–${block.endTime}`}
              >
                <span className="block font-semibold">
                  {block.startTime}–{block.endTime}
                  {block.label ? ` · ${block.label}` : ""}
                </span>
                <span className="block text-sm font-semibold">
                  {coverageLabels[block.state]}
                </span>
                <span className="mt-2 block text-sm">
                  Disponibles: {block.coverage.availableCount} · Capacidad:{" "}
                  {block.coverage.capacity ?? "por definir"}
                </span>
                <span className="block text-sm">
                  Faltan: {block.coverage.remainingCapacity ?? "—"} · Reserva
                  potencial: {block.coverage.reservePotential ?? "—"}
                </span>
                <span className="mt-2 block text-sm underline">
                  Ver participantes →
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
