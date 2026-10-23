"use client";

import { MapPin, Plus, ShieldCheck } from "lucide-react";
import type { PlannerAssignment, PlannerView } from "../domain/planner";

export const plannerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const shortName = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");

function PersonLine({ assignment, busy, mutable, change }: {
  assignment: PlannerAssignment;
  busy: boolean;
  mutable: boolean;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  const { person } = assignment;
  return (
    <div className="group/person flex min-w-0 items-center gap-1.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-[8px] font-black text-teal-800">{initials(person.fullName)}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700" title={person.fullName}>{shortName(person.fullName)}</span>
      {person.isMinor && <ShieldCheck size={12} className="shrink-0 text-violet-700" aria-label="Menor" />}
      {mutable && <span className="hidden shrink-0 gap-1 group-hover/person:flex"><button type="button" disabled={busy} onClick={() => change(assignment, "move")} className="text-[10px] font-bold text-teal-800 hover:underline">Cambiar</button><button type="button" disabled={busy} onClick={() => change(assignment, "cancel")} className="text-[10px] font-bold text-slate-500 hover:underline">Quitar</button></span>}
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
  const filled = point.slots.filter(Boolean).length;
  const editable = view.mutable && point.active && point.globalActive;
  const canAdd = editable && filled < 4 && (filled < 2 || view.canAssignSupport);
  const status = !point.active ? { label: "No activo", style: "bg-slate-100 text-slate-500" } : filled === 0 ? { label: "Sin asignar", style: "bg-slate-100 text-slate-600" } : filled === 1 ? { label: "Incompleto", style: "bg-amber-50 text-amber-800" } : filled === 2 ? { label: "Cubierto", style: "bg-emerald-50 text-emerald-800" } : { label: "Con apoyo", style: "bg-sky-50 text-sky-800" };
  const surface = !point.active
    ? "border-slate-200 bg-slate-50 opacity-75"
    : filled === 0
      ? "border-slate-200 bg-white"
      : filled === 1
        ? "border-[#CFE58A] bg-[#F2FAD7]"
        : filled === 2
          ? "border-emerald-200 bg-emerald-50"
          : "border-sky-200 bg-sky-50";

  return (
    <article className={`min-h-[118px] rounded-xl border p-2.5 shadow-sm ${surface}`}>
      <header className="flex items-start justify-between gap-1"><div className="flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0 text-teal-700" /><h3 className="truncate text-xs font-black text-slate-900" title={point.name}>{point.name}</h3></div><label className="flex shrink-0 items-center" title={point.active ? "Desactivar punto en este horario" : "Activar punto en este horario"}><input type="checkbox" className="h-3.5 w-3.5 accent-teal-700" checked={point.active} disabled={saving || !view.mutable || (!point.globalActive && !point.active)} onChange={(event) => activate(point.id, event.target.checked)} aria-label={`Activar ${point.name}`} /></label></header>
      <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.style}`}>{status.label}</span>
      {!point.globalActive ? <p className="mt-2 text-[10px] leading-4 text-slate-500">Inactivo en la configuración general.</p> : <div className="mt-1.5 space-y-1">{point.slots.filter(Boolean).map((assignment) => <PersonLine key={assignment!.id} assignment={assignment!} busy={saving} mutable={editable} change={change} />)}{canAdd && <button type="button" className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-teal-300 px-1.5 py-1 text-[10px] font-bold text-teal-800 transition hover:bg-teal-50 disabled:opacity-40" disabled={saving} onClick={() => openSlot(point.id, (filled + 1) as 1 | 2 | 3 | 4)}><Plus size={12} /> Añadir</button>}{point.active && !filled && <p className="pt-1 text-[10px] text-slate-400">Aún sin hermano asignado</p>}</div>}
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
  return <div className="overflow-x-auto px-2 py-2" aria-label="Puntos y asignaciones"><div className="grid min-w-max grid-flow-col auto-cols-[148px] gap-2">{view.points.map((point) => <PointCard key={point.id} point={point} view={view} saving={saving} activate={activate} openSlot={openSlot} change={change} />)}</div></div>;
}
