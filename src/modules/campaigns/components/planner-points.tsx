"use client";

import { MoreHorizontal, Plus, ShieldCheck } from "lucide-react";
import type { PlannerAssignment, PlannerView } from "../domain/planner";

export const plannerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-40";
const shortName = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");

function PersonLine({ assignment, busy, mutable, change }: {
  assignment: PlannerAssignment;
  busy: boolean;
  mutable: boolean;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  const { person } = assignment;
  return (
    <div className="flex min-w-0 items-center gap-1 border-b border-black/5 py-0.5 last:border-0">
      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-4 text-slate-800" title={person.fullName}>{shortName(person.fullName)}</span>
      {person.isMinor && <ShieldCheck size={11} className="shrink-0 text-violet-700" aria-label={`Menor · Responsable: ${person.guardianName ?? "pendiente"}`} />}
      {mutable && (
        <details className="relative shrink-0">
          <summary className="grid h-5 w-5 cursor-pointer list-none place-items-center rounded text-slate-500 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" aria-label={`Opciones de ${person.fullName}`}><MoreHorizontal size={13} /></summary>
          <div className="absolute right-0 top-5 z-30 w-24 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button type="button" disabled={busy} onClick={() => change(assignment, "move")} className="block w-full rounded px-2 py-1 text-left text-[10px] font-semibold text-teal-800 hover:bg-teal-50">Mover</button>
            <button type="button" disabled={busy} onClick={() => change(assignment, "cancel")} className="block w-full rounded px-2 py-1 text-left text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Liberar</button>
          </div>
        </details>
      )}
    </div>
  );
}

function PointCard({ point, view, saving, activate, openSlot, change }: {
  point: PlannerView["points"][number];
  view: PlannerView;
  saving: boolean;
  activate: (pointId: string, active: boolean) => void;
  openSlot: (pointId: string, slotNumber: 1 | 2 | 3 | 4) => void;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  const assignments = point.slots.filter(Boolean) as PlannerAssignment[];
  const filled = assignments.length;
  const firstEmpty = point.slots.findIndex((slot) => !slot) + 1;
  const editable = view.mutable && point.active && point.globalActive;
  const canAdd = editable && firstEmpty > 0 && (firstEmpty <= 2 || view.canAssignSupport);
  const status = !point.active
    ? { label: "Inactivo", style: "bg-slate-200 text-slate-600" }
    : filled === 0 ? null
      : filled === 1 ? { label: "Incompleto", style: "bg-amber-100 text-amber-800" }
        : filled === 2 ? { label: "Cubierto", style: "bg-emerald-100 text-emerald-800" }
          : { label: "Con apoyo", style: "bg-sky-100 text-sky-800" };
  const surface = !point.active
    ? "border-slate-200 bg-slate-50 opacity-75"
    : filled === 0 ? "border-slate-200 bg-white"
      : filled === 1 ? "border-[#CFE58A] bg-[#F2FAD7]"
        : filled === 2 ? "border-emerald-200 bg-emerald-50"
          : "border-sky-200 bg-sky-50";
  return (
    <article className={`min-h-[108px] rounded-lg border p-1.5 shadow-sm ${surface}`} data-point-state={!point.active ? "inactive" : filled === 0 ? "empty" : filled === 1 ? "partial" : filled === 2 ? "covered" : "support"}>
      <header className="flex min-h-5 items-start justify-between gap-1">
        <h3 className="truncate text-[10px] font-black leading-4 text-slate-900" title={point.name}>{point.name}</h3>
        <details className="relative shrink-0">
          <summary className="grid h-5 w-5 cursor-pointer list-none place-items-center rounded text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" aria-label={`Opciones de ${point.name}`}><MoreHorizontal size={13} /></summary>
          <div className="absolute right-0 top-5 z-30 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button type="button" className="w-full rounded px-2 py-1 text-left text-[10px] font-semibold text-slate-700 hover:bg-slate-50" disabled={saving || !view.mutable || (!point.globalActive && !point.active)} onClick={() => activate(point.id, !point.active)}>{point.active ? "Inactivar punto" : "Activar punto"}</button>
          </div>
        </details>
      </header>
      {status && <span className={`mb-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold ${status.style}`}>{status.label}</span>}
      {!point.globalActive ? <p className="mt-1 text-[9px] leading-3 text-slate-500">No disponible en la configuración.</p> : (
        <div className="space-y-0.5">
          {assignments.map((assignment) => <PersonLine key={assignment.id} assignment={assignment} busy={saving} mutable={editable} change={change} />)}
          {canAdd && <button type="button" className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-teal-300 px-1 py-1 text-[9px] font-bold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-40" disabled={saving} onClick={() => openSlot(point.id, firstEmpty as 1 | 2 | 3 | 4)}><Plus size={11} /> Añadir</button>}
        </div>
      )}
    </article>
  );
}

export function PlannerPoints({ view, saving, activate, openSlot, change }: {
  view: PlannerView;
  saving: boolean;
  activate: (pointId: string, active: boolean) => void;
  openSlot: (pointId: string, slotNumber: 1 | 2 | 3 | 4) => void;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  return <div className="min-w-0 overflow-x-auto px-1.5 py-1.5" aria-label="Puntos y asignaciones"><div className="grid min-w-[920px] gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(view.points.length, 1)}, minmax(108px, 1fr))` }}>{view.points.map((point) => <PointCard key={point.id} point={point} view={view} saving={saving} activate={activate} openSlot={openSlot} change={change} />)}</div></div>;
}

/**
 * Daily planning board: points are read vertically and time blocks horizontally,
 * matching the printable program. Each cell retains the same per-block actions.
 */
export function PlannerScheduleMatrix({ views, saving, activate, openSlot, change }: {
  views: PlannerView[];
  saving: boolean;
  activate: (view: PlannerView, pointId: string, active: boolean) => void;
  openSlot: (view: PlannerView, pointId: string, slotNumber: 1 | 2 | 3 | 4) => void;
  change: (view: PlannerView, assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  const pointRows = new Map<string, { id: string; name: string }>();
  for (const view of views) for (const point of view.points)
    if (!pointRows.has(point.id)) pointRows.set(point.id, { id: point.id, name: point.name });
  const points = [...pointRows.values()];
  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Tablero diario de planificación">
      <div className="min-w-[1040px]">
        <div className="grid border-b border-teal-800 bg-teal-700 text-white" style={{ gridTemplateColumns: `150px repeat(${Math.max(views.length, 1)}, minmax(170px, 1fr))` }}>
          <div className="px-4 py-3 text-sm font-black">Punto</div>
          {views.map((view) => <div key={view.block?.id} className="border-l border-teal-500 px-3 py-3 text-center"><p className="text-sm font-black">{view.block?.startTime}–{view.block?.endTime}</p><p className="mt-0.5 text-[10px] font-semibold text-teal-100">{view.block?.label || "Horario"}</p></div>)}
        </div>
        {points.map((row, rowIndex) => <div key={row.id} className="grid border-b border-slate-200 last:border-b-0" style={{ gridTemplateColumns: `150px repeat(${Math.max(views.length, 1)}, minmax(170px, 1fr))` }}>
          <div className={`flex min-h-[138px] items-center border-r border-slate-200 px-4 text-sm font-black text-slate-900 ${rowIndex % 2 ? "bg-[#EFF9F7]" : "bg-white"}`}>{row.name}</div>
          {views.map((view) => {
            const point = view.points.find((item) => item.id === row.id);
            if (!point) return <div key={view.block?.id} className="border-r border-slate-200 bg-slate-50" />;
            return <div key={view.block?.id} className="border-r border-slate-200 p-2 last:border-r-0"><PointCard point={point} view={view} saving={saving} activate={(pointId, active) => activate(view, pointId, active)} openSlot={(pointId, slotNumber) => openSlot(view, pointId, slotNumber)} change={(assignment, action) => change(view, assignment, action)} /></div>;
          })}
        </div>)}
      </div>
    </section>
  );
}
