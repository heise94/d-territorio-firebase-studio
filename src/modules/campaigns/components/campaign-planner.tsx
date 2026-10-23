"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { campaignFetch } from "../lib/campaign-fetch";
import { campaignStatusLabels } from "../lib/presentation";
import type {
  PlannerAssignment,
  PlannerPerson,
  PlannerView,
  PlannerWarningDTO,
} from "../domain/planner";
import { PlannerPoints, plannerButton } from "./planner-points";
import {
  PlannerDecisionDialog,
  type PlannerDecision,
} from "./planner-decision";

type PlannerTarget = {
  blockId: string;
  pointId: string;
  slotNumber: 1 | 2 | 3 | 4;
};

class PlannerHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public warnings: PlannerWarningDTO[] = [],
  ) {
    super(message);
  }
}

const spanishDate = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));

const personKey = (person: PlannerPerson) =>
  `${person.registrationId}:${person.fullName}`;

export function CampaignPlanner({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<PlannerView | null>(null);
  const [dayViews, setDayViews] = useState<PlannerView[]>([]);
  const [dayId, setDayId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [target, setTarget] = useState<PlannerTarget | null>(null);
  const [query, setQuery] = useState("");
  const [showExceptions, setShowExceptions] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [decision, setDecision] = useState<PlannerDecision | null>(null);
  const [warnings, setWarnings] = useState<PlannerWarningDTO[]>([]);
  const [decisionError, setDecisionError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;

  const fetchView = useCallback(
    async (token: string, selectedBlockId: string, signal: AbortSignal) => {
      const response = await campaignFetch(
        `${base}/planner${selectedBlockId ? `?blockId=${encodeURIComponent(selectedBlockId)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new PlannerHttpError(data.error, response.status);
      return data as PlannerView;
    },
    [base],
  );

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    if (!user) {
      setAnchor(null);
      setDayViews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken(true);
      const first = await fetchView(token, blockId, controller.signal);
      if (controller.signal.aborted) return;
      const selectedDay = dayId || first.block?.dayId || "";
      const blocks = first.blocks.filter((block) => block.dayId === selectedDay);
      const views = await Promise.all(
        blocks.map((block) =>
          block.id === first.block?.id
            ? Promise.resolve(first)
            : fetchView(token, block.id, controller.signal),
        ),
      );
      if (controller.signal.aborted) return;
      setAnchor(first);
      setDayId(selectedDay);
      setDayViews(views);
      setError("");
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof PlannerHttpError && [401, 403].includes(failure.status)) {
          setAnchor(null);
          setDayViews([]);
        }
        setError(failure instanceof Error ? failure.message : "No se pudo actualizar la planificación.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [user, fetchView, blockId, dayId]);

  useEffect(() => {
    setTarget(null);
    setDecision(null);
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !mutation.current) void refresh();
    }, 20000);
    return () => {
      pending.current?.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function write(path: string, method: string, input: unknown) {
    if (!user || mutation.current) return false;
    mutation.current = true;
    setSaving(true);
    setSaved("");
    try {
      const response = await campaignFetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${await user.getIdToken(true)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok)
        throw new PlannerHttpError(data.error, response.status, data.warnings ?? []);
      setSaved("Planificación guardada.");
      await refresh();
      return true;
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }

  async function activate(view: PlannerView, pointId: string, active: boolean) {
    try {
      await write("/block-points", "POST", {
        timeBlockId: view.block!.id,
        pointId,
        active,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar.");
      await refresh();
    }
  }

  function start(value: PlannerDecision) {
    setDecision(value);
    setWarnings([]);
    setDecisionError("");
  }

  function openSlot(block: PlannerView, pointId: string, slotNumber: 1 | 2 | 3 | 4) {
    setTarget({ blockId: block.block!.id, pointId, slotNumber });
    setShowExceptions(false);
    setQuery("");
  }

  async function submit(
    pointId: string,
    slotNumber: 1 | 2 | 3 | 4,
    overrides: {
      registrationId: string;
      availability: boolean;
      maxTurns: boolean;
      capacity: boolean;
    }[],
    adultSupportRegistrationId?: string,
  ) {
    if (!decision) return;
    setDecisionError("");
    try {
      const targetView = dayViews.find((view) => view.block?.id === decision.blockId);
      const input =
        decision.action === "create"
          ? {
              timeBlockId: targetView?.block?.id ?? target?.blockId,
              pointId,
              slotNumber,
              registrationId: decision.person.registrationId,
              adultSupportRegistrationId,
              overrides,
            }
          : {
              action: decision.action,
              expectedVersion: decision.assignment!.version,
              ...(decision.action === "move" ? { pointId, slotNumber, overrides } : {}),
            };
      if (
        await write(
          decision.action === "create"
            ? "/assignments"
            : `/assignments/${encodeURIComponent(decision.assignment!.id)}`,
          decision.action === "create" ? "POST" : "PATCH",
          input,
        )
      ) {
        setDecision(null);
        setTarget(null);
      }
    } catch (failure) {
      if (failure instanceof PlannerHttpError && failure.status === 422) setWarnings(failure.warnings);
      setDecisionError(failure instanceof Error ? failure.message : "No se pudo guardar.");
    }
  }

  const days = useMemo(
    () =>
      anchor
        ? [...new Map(anchor.blocks.map((block) => [block.dayId, block.date])).entries()].map(
            ([id, date]) => ({ id, date }),
          )
        : [],
    [anchor],
  );
  const dayIndex = Math.max(0, days.findIndex((day) => day.id === dayId));
  const targetView = target
    ? dayViews.find((view) => view.block?.id === target.blockId) ?? null
    : null;
  const targetPoint = targetView?.points.find((point) => point.id === target?.pointId);
  const baseCandidates = targetView
    ? showExceptions
      ? targetView.exceptions
      : targetView.available
    : [];
  const candidates = [...baseCandidates]
    .filter((person) => person.fullName.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")))
    .sort(
      (a, b) =>
        Number(a.assignedToday > 0) - Number(b.assignedToday > 0) ||
        a.fullName.localeCompare(b.fullName, "es"),
    );
  const dayPeople = new Map<string, PlannerPerson>();
  for (const view of dayViews)
    for (const person of [...view.available, ...view.exceptions])
      dayPeople.set(personKey(person), person);
  const metrics = {
    blocks: dayViews.length,
    activePoints: dayViews.reduce((sum, view) => sum + view.metrics.activePoints, 0),
    capacity: dayViews.reduce((sum, view) => sum + (view.block?.capacity ?? 0), 0),
    assigned: dayViews.reduce((sum, view) => sum + view.metrics.assigned, 0),
    open: dayViews.reduce((sum, view) => sum + view.metrics.openSlots, 0),
    available: [...dayPeople.values()].filter((person) => person.available).length,
    pairs: [...dayPeople.values()].filter((person) => person.accepted && person.assignedToday === 0).length / 2,
  };
  const withoutTurn = candidates.filter((person) => person.assignedToday === 0);
  const withTurn = candidates.filter((person) => person.assignedToday > 0);
  const candidateRow = (person: PlannerPerson) => (
    <li key={person.registrationId}>
      <button
        className="w-full rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50"
        disabled={saving || !person.profileActive || !targetView?.mutable}
        onClick={() => targetView && target && start({ action: "create", blockId: targetView.block!.id, person, pointId: target.pointId, slotNumber: target.slotNumber })}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">{person.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{person.fullName}</span><span className="block truncate text-xs text-slate-500">{person.congregation}</span><span className="mt-1 flex flex-wrap gap-1">{person.assignedToday > 0 && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Ya participa hoy</span>}{person.accepted && <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">🔗 Con {person.accepted.otherName}</span>}{person.isMinor && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">Menor · {person.guardianName ?? "responsable pendiente"}</span>}</span></span>
          <span className="shrink-0 rounded-lg border border-teal-700 px-2 py-1 text-[11px] font-bold text-teal-800">Asignar</span>
        </div>
      </button>
    </li>
  );

  return (
    <main className="mx-auto max-w-[1920px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/campanas/admin/participantes/${campaignId}`} className="text-sm font-semibold text-teal-800">← Participantes y cobertura</Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Planificación</h1>
          {anchor && <p className="mt-1 text-slate-500">{anchor.campaign.name} · {campaignStatusLabels[anchor.campaign.status]}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/campanas/admin/programa/${campaignId}`} className={plannerButton}>Ver programa</Link>
          <button className={plannerButton} disabled={loading || saving} onClick={() => void refresh()}>Actualizar</button>
        </div>
      </div>

      {anchor && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid items-center gap-2 sm:grid-cols-[auto_minmax(260px,1fr)_auto]">
              <button className={plannerButton} disabled={saving || dayIndex <= 0} onClick={() => { const previous = days[dayIndex - 1]; setDayId(previous.id); setBlockId(anchor.blocks.find((block) => block.dayId === previous.id)?.id ?? ""); }}><ChevronLeft size={18} /> Día anterior</button>
              <label className="relative flex items-center justify-center gap-2 text-center text-base font-black text-slate-950"><CalendarDays size={18} className="text-teal-700" /><span className="sr-only">Día</span><select className="appearance-none bg-transparent pr-4 text-center text-base font-black text-slate-950 outline-none" value={dayId} disabled={saving} onChange={(event) => { const nextDay = event.target.value; setDayId(nextDay); setBlockId(anchor.blocks.find((block) => block.dayId === nextDay)?.id ?? ""); }}>{days.map((day) => <option key={day.id} value={day.id}>{spanishDate(day.date)}</option>)}</select></label>
              <button className={plannerButton} disabled={saving || dayIndex >= days.length - 1} onClick={() => { const next = days[dayIndex + 1]; setDayId(next.id); setBlockId(anchor.blocks.find((block) => block.dayId === next.id)?.id ?? ""); }}>Día siguiente <ChevronRight size={18} /></button>
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Bloques", metrics.blocks, "horarios del día"],
              ["Puntos activos", metrics.activePoints, "por bloque"],
              ["Cupos del día", metrics.capacity || "—", "meta configurada"],
              ["Asignaciones", metrics.assigned, "personas ubicadas"],
              ["Pendientes", metrics.open, "lugares base abiertos"],
              ["Disponibles", metrics.available, `${metrics.pairs || 0} con compañero pendiente`],
            ].map(([label, value, note]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="text-xl font-black text-slate-950">{value}</p><p className="text-[10px] text-slate-500">{note}</p></article>)}
          </section>

          {!anchor.mutable && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Solo lectura. Para modificar asignaciones la campaña debe estar en planificación y el día activo.</p>}
          <p role="status" className="text-sm text-slate-500">{saving ? "Guardando planificación…" : saved || (loading ? "Actualizando planificación…" : "El panel se actualiza mientras trabajas.")}</p>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

          <div className="relative">
            <section className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm transition-all ${target ? "2xl:mr-[376px]" : ""}`}>
              <div className="min-w-[1140px] divide-y divide-slate-200">
                {dayViews.map((view, index) => {
                  const activePoints = view.points.filter((point) => point.active);
                  const covered = activePoints.filter((point) => point.slots.filter(Boolean).length >= 2).length;
                  const rowTone = !activePoints.length ? "bg-slate-50" : covered === activePoints.length ? "bg-emerald-50/80" : "bg-amber-50/75";
                  return (
                    <article key={view.block?.id} className="grid grid-cols-[146px_minmax(0,1fr)]">
                      <header className={`flex min-h-[140px] flex-col justify-center border-r border-slate-200 px-4 ${rowTone}`}>
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Clock3 size={13} /> Bloque {index + 1}</span>
                        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{view.block?.startTime}<br />– {view.block?.endTime}</h2>
                        <p className="mt-2 text-xs font-semibold text-slate-600">{covered}/{activePoints.length} puntos cubiertos</p>
                        <span className={`mt-2 inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-bold ${covered === activePoints.length && activePoints.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{covered === activePoints.length && activePoints.length ? "Completo" : "Por completar"}</span>
                      </header>
                      <PlannerPoints view={view} saving={saving || loading} activate={(pointId, active) => void activate(view, pointId, active)} openSlot={(pointId, slotNumber) => openSlot(view, pointId, slotNumber)} change={(assignment, action) => start({ action, blockId: view.block!.id, person: assignment.person, assignment, pointId: assignment.pointId, slotNumber: assignment.slotNumber })} />
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className={`z-20 mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg 2xl:absolute 2xl:right-0 2xl:top-0 2xl:mt-0 2xl:w-[360px] ${target ? "2xl:block" : "2xl:hidden"}`}>
              {target && targetView && targetPoint ? (
                <>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Añadir a</p><h2 className="mt-1 font-black text-slate-950">{targetPoint.name}</h2><p className="mt-1 text-sm text-slate-500">{targetView.block?.startTime} – {targetView.block?.endTime} · Lugar {target.slotNumber}</p></div><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setTarget(null)} aria-label="Cerrar selector"><X size={20} /></button></div>
                  <label className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar hermano" /></label>
                  <button className="text-sm font-semibold text-teal-800" onClick={() => setShowExceptions((current) => !current)}>{showExceptions ? "Ver solo disponibles" : "Usar excepción de disponibilidad"}</button>
                  {showExceptions && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Estas personas no marcaron este horario. El sistema pedirá una confirmación explícita.</p>}
                  <p className="text-xs text-slate-500">Primero aparecen quienes aún no tienen asignación este día. Los ya usados hoy quedan identificados.</p>
                  <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                    {!!withoutTurn.length && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">Sin turno hoy ({withoutTurn.length})</h3></div><ul className="space-y-2">{withoutTurn.map(candidateRow)}</ul></section>}
                    {!!withTurn.length && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">Ya participan hoy ({withTurn.length})</h3></div><ul className="space-y-2">{withTurn.map(candidateRow)}</ul></section>}
                  </div>
                  {!candidates.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No hay hermanos disponibles para este bloque con esos criterios.</p>}
                </>
              ) : <div className="py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-800"><Users size={24} /></span><h2 className="mt-3 font-black text-slate-950">Selecciona un lugar</h2><p className="mt-2 text-sm text-slate-500">Pulsa “Añadir” en un punto para ver solo los hermanos disponibles en ese horario.</p></div>}
            </aside>
          </div>
        </>
      )}

      {decision && dayViews.find((view) => view.block?.id === decision.blockId) && (
        <PlannerDecisionDialog
          key={decision.action + decision.person.registrationId}
          decision={decision}
          view={dayViews.find((view) => view.block?.id === decision.blockId)!}
          saving={saving}
          warnings={warnings}
          error={decisionError}
          close={() => setDecision(null)}
          submit={(point, slot, overrides, adultSupportRegistrationId) => void submit(point, slot, overrides, adultSupportRegistrationId)}
        />
      )}
    </main>
  );
}
