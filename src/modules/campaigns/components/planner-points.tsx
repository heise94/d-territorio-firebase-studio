"use client";

import { MapPin, Plus, ShieldCheck } from "lucide-react";
import type { PlannerAssignment, PlannerView } from "../domain/planner";

export const plannerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function AssignmentSlot({
  assignment,
  slotNumber,
  allowAdditional,
  busy,
  mutable,
  openSlot,
  change,
}: {
  assignment: PlannerAssignment | null;
  slotNumber: 1 | 2 | 3 | 4;
  allowAdditional: boolean;
  busy: boolean;
  mutable: boolean;
  openSlot: (slotNumber: 1 | 2 | 3 | 4) => void;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
}) {
  const isAdditional = slotNumber >= 3;
  if (isAdditional && !allowAdditional && !assignment) return null;
  if (!assignment)
    return (
      <button
        type="button"
        onClick={() => openSlot(slotNumber)}
        disabled={busy || !mutable}
        className="flex min-h-20 w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-teal-700 shadow-sm"><Plus size={19} /></span>
        <span><span className="block">Añadir {isAdditional ? "apoyo" : "hermano"}</span><span className="text-xs font-normal text-slate-400">{isAdditional ? `Lugar adicional ${slotNumber - 2}` : `Lugar ${slotNumber}`}</span></span>
      </button>
    );
  const { person } = assignment;
  return (
    <article className="min-h-20 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">{initials(person.fullName)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{person.fullName}</p>
          <p className="truncate text-xs text-slate-500">{person.congregation}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {person.assignedToday > 1 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Ya asignado hoy</span>}
            {person.accepted && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Compañero acordado</span>}
            {person.isMinor && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">Menor</span>}
            {person.guardianName && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Responsable</span>}
          </div>
        </div>
      </div>
      {person.isMinor && person.guardianName && <p className="mt-2 flex items-center gap-1 text-xs text-violet-800"><ShieldCheck size={13} /> Responsable: {person.guardianName}</p>}
      <div className="mt-3 flex gap-3"><button className="text-xs font-semibold text-teal-800 disabled:opacity-40" disabled={busy || !mutable} onClick={() => change(assignment, "move")}>Cambiar</button><button className="text-xs font-semibold text-slate-500 disabled:opacity-40" disabled={busy || !mutable} onClick={() => change(assignment, "cancel")}>Quitar</button></div>
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
  return (
    <section className="space-y-4" aria-label="Puntos y asignaciones">
      <div><h3 className="text-lg font-bold text-slate-950">Puntos de este horario</h3><p className="text-sm text-slate-500">Completa los dos lugares base y añade apoyo solo cuando haga falta.</p></div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {view.points.map((point) => {
          const filled = point.slots.filter(Boolean).length;
          const showThird = view.canAssignSupport && (filled >= 2 || !!point.slots[2]);
          const showFourth = view.canAssignSupport && (filled >= 3 || !!point.slots[3]);
          const editable = view.mutable && point.active && point.globalActive;
          return (
            <article key={point.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${point.active ? "border-slate-200" : "border-slate-200 opacity-75"}`}>
              <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                <div className="flex min-w-0 gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><MapPin size={20} /></span><div className="min-w-0"><h4 className="truncate font-bold text-slate-950">{point.name}</h4><p className="text-xs text-slate-500">{filled} {filled === 1 ? "asignado" : "asignados"} · {point.active ? "Activo" : "No activo"}</p></div></div>
                <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" className="h-4 w-4 accent-teal-700" checked={point.active} disabled={saving || !view.mutable || (!point.globalActive && !point.active)} onChange={(event) => activate(point.id, event.target.checked)} />Activo</label>
              </header>
              {!point.globalActive && <p className="mx-4 mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Este punto está inactivo en la configuración general.</p>}
              {(point.active || filled > 0) && <div className="space-y-2 p-4">
                {point.slots.slice(0, 2).map((assignment, index) => <AssignmentSlot key={index} assignment={assignment} slotNumber={(index + 1) as 1 | 2} allowAdditional={false} busy={saving} mutable={editable} openSlot={(slot) => openSlot(point.id, slot)} change={change} />)}
                {showThird && <AssignmentSlot assignment={point.slots[2]} slotNumber={3} allowAdditional={view.canAssignSupport} busy={saving} mutable={editable} openSlot={(slot) => openSlot(point.id, slot)} change={change} />}
                {showFourth && <AssignmentSlot assignment={point.slots[3]} slotNumber={4} allowAdditional={view.canAssignSupport} busy={saving} mutable={editable} openSlot={(slot) => openSlot(point.id, slot)} change={change} />}
                {view.canAssignSupport && filled >= 2 && !showThird && <button className="w-full rounded-xl border border-dashed border-teal-300 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50" disabled={saving || !editable} onClick={() => openSlot(point.id, 3)}><Plus size={16} className="mr-1 inline" /> Añadir tercer integrante</button>}
                {view.canAssignSupport && filled >= 3 && !showFourth && <button className="w-full rounded-xl border border-dashed border-teal-300 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50" disabled={saving || !editable} onClick={() => openSlot(point.id, 4)}><Plus size={16} className="mr-1 inline" /> Añadir cuarto integrante</button>}
              </div>}
              {point.active && filled < 2 && <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">Falta completar el equipo base.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
