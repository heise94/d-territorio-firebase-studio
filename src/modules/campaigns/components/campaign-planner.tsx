"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link2,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { campaignFetch } from "../lib/campaign-fetch";
import { campaignStatusLabels } from "../lib/presentation";
import { loadPlannerDay, PlannerHttpError, plannerResponse, plannerViewAfterFailure } from "../lib/planner-day-client";
import { operationalPlannerSummary, participantTurnLabel, pendingPairRequestIds } from "../lib/planner-day-ux";
import type {
  PlannerAssignment,
  PlannerDayView,
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

const spanishDate = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));

export function CampaignPlanner({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<PlannerDayView | null>(null);
  const dayViews = anchor?.blocks ?? [];
  const [dayId, setDayId] = useState("");
  const [target, setTarget] = useState<PlannerTarget | null>(null);
  const [query, setQuery] = useState("");
  const [showExceptions, setShowExceptions] = useState(false);
  const [pairOnly, setPairOnly] = useState(false);
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

  // Never carry private data across a changed identity or campaign.
  useEffect(() => { setAnchor(null); setDayId(""); }, [user, campaignId]);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    if (!user) {
      setAnchor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = window.setTimeout(() => {
      if (pending.current !== controller) return;
      controller.abort("timeout");
      setError("No pudimos actualizar la planificación. Reintentar");
      setLoading(false);
    }, 30000);
    controller.signal.addEventListener("abort", () => window.clearTimeout(timeout), { once: true });
    try {
      const token = await user.getIdToken();
      const day = await loadPlannerDay(campaignFetch, base, token, dayId, controller.signal);
      if (controller.signal.aborted) return;
      setAnchor(day);
      setError("");
    } catch (failure) {
      if (!controller.signal.aborted) {
        setAnchor((previous) => plannerViewAfterFailure(previous, failure));
        setTarget(null);
        setDecision(null);
        setError(failure instanceof PlannerHttpError ? failure.message : "No pudimos actualizar la planificación. Reintentar");
      }
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [user, base, dayId]);

  useEffect(() => {
    setTarget(null);
    setDecision(null);
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !mutation.current && !pending.current) void refresh();
    }, 20000);
    return () => {
      pending.current?.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function write(path: string, method: string, input: unknown) {
    if (!user || mutation.current || loading || error) return false;
    mutation.current = true;
    setSaving(true);
    setSaved("");
    try {
      const response = await campaignFetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      await plannerResponse(response);
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
    if (loading || error) return;
    setDecision(value);
    setWarnings([]);
    setDecisionError("");
  }

  function openSlot(block: PlannerView, pointId: string, slotNumber: 1 | 2 | 3 | 4, onlyPairs = false) {
    if (loading || error) return;
    setTarget({ blockId: block.block!.id, pointId, slotNumber });
    setShowExceptions(false);
    setPairOnly(onlyPairs);
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

  const days = anchor?.days ?? [];
  const dayIndex = Math.max(0, days.findIndex((day) => day.id === anchor?.day?.id));
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
    .filter((person) => !pairOnly || person.accepted)
    .sort(
      (a, b) =>
        Number(a.assignedToday > 0) - Number(b.assignedToday > 0) ||
        a.fullName.localeCompare(b.fullName, "es"),
    );
  const metrics = operationalPlannerSummary(dayViews);
  const withoutTurn = candidates.filter((person) => person.assignedToday === 0);
  const withTurn = candidates.filter((person) => person.assignedToday > 0);
  function openPendingPairs() {
    const pendingIds = new Set(pendingPairRequestIds(dayViews));
    for (const view of dayViews) {
      const availableIds = new Set(view.available.map((item) => item.registrationId));
      const person = view.available.find((item) => item.accepted && pendingIds.has(item.accepted.requestId) && availableIds.has(item.accepted.otherRegistrationId));
      const point = view.points.find((item) => {
        const firstEmpty = item.slots.findIndex((slot) => !slot) + 1;
        return item.active && item.globalActive && firstEmpty > 0 && (firstEmpty <= 2 || view.canAssignSupport);
      });
      if (person && point) {
        const slot = point.slots.findIndex((item) => !item) + 1;
        if (slot <= 2 || view.canAssignSupport) openSlot(view, point.id, slot as 1 | 2 | 3 | 4, true);
        return;
      }
    }
  }
  const candidateRow = (person: PlannerPerson) => {
    const placements = targetView?.points.flatMap((point) => point.slots.filter(Boolean).map((slot) => ({ registrationId: slot!.registrationId, pointId: point.id }))) ?? [];
    const linkedPlacement = person.accepted ? placements.find((item) => item.registrationId === person.accepted!.otherRegistrationId) : undefined;
    const guardianPlacement = person.guardianRegistrationId ? placements.find((item) => item.registrationId === person.guardianRegistrationId) : undefined;
    const linkedConflict = !!linkedPlacement && linkedPlacement.pointId !== target?.pointId;
    const guardianConflict = !!guardianPlacement && guardianPlacement.pointId !== target?.pointId;
    const blocked = linkedConflict || guardianConflict;
    const completesPair = !!linkedPlacement && linkedPlacement.pointId === target?.pointId;
    const pairReady = !!person.accepted && !person.accepted.blockAvailabilityConflict && (!person.accepted.participationConflict || completesPair) && !blocked;
    return (
      <li key={person.registrationId} className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900" title={person.fullName}>{person.fullName}</p>
            <p className="truncate text-xs text-slate-500">{person.congregation}</p>
            <p className={`mt-1 text-[11px] font-semibold ${person.assignedToday ? "text-amber-700" : "text-teal-700"}`}>{participantTurnLabel(person, dayViews)}</p>
            {person.accepted && <div className="mt-1"><span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800"><Link2 className="mr-1 inline" size={10} />Compañero acordado</span><p className="mt-1 text-[11px] text-slate-600">Con {person.accepted.otherName}</p></div>}
            {person.isMinor && <p className="mt-1 text-[11px] font-semibold text-violet-800">Menor · Responsable: {person.guardianName ?? "pendiente"}</p>}
            {blocked && <p className="mt-1 text-[10px] font-semibold text-red-700">{linkedConflict ? "Su compañero ya está ubicado en este horario." : "Su responsable ya está ubicado en otro punto de este horario."}</p>}
          </div>
          <button className="shrink-0 rounded-lg border border-teal-700 px-2 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-40" disabled={blocked || saving || loading || !!error || !person.profileActive || !targetView?.mutable} onClick={() => targetView && target && start({ action: "create", blockId: targetView.block!.id, person, pointId: target.pointId, slotNumber: target.slotNumber })}>
            {person.accepted ? (completesPair ? "Completar vínculo" : pairReady ? "Asignar juntos" : "Revisar vínculo") : "Asignar"}
          </button>
        </div>
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-[1920px] space-y-4 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/campanas/admin/participantes/${campaignId}`} className="text-sm font-semibold text-teal-800">← Participantes y cobertura</Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Planificación</h1>
          {anchor && <p className="mt-1 text-sm text-slate-500">{anchor.campaign.name} · {campaignStatusLabels[anchor.campaign.status]}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/campanas/admin/programa/${campaignId}`} className={plannerButton}>Ver programa</Link>
          <button className={plannerButton} disabled={loading || saving} onClick={() => void refresh()}>Actualizar</button>
        </div>
      </div>

      {!anchor && loading && <p role="status" className="rounded-xl border bg-white p-6">Cargando planificación del día…</p>}
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{error}</p>{anchor && <p>Seguimos mostrando la última planificación cargada.</p>}<button className={plannerButton} disabled={loading} onClick={() => void refresh()}>Reintentar</button></div>}
      {anchor && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid items-center gap-2 sm:grid-cols-[auto_minmax(260px,1fr)_auto]">
              <button className={plannerButton} disabled={saving || loading || dayIndex <= 0} onClick={() => setDayId(days[dayIndex - 1].id)}><ChevronLeft size={18} /> Día anterior</button>
              <label className="relative flex items-center justify-center gap-2 text-center text-base font-black text-slate-950"><CalendarDays size={18} className="text-teal-700" /><span className="sr-only">Día</span><select className="appearance-none bg-transparent pr-4 text-center text-base font-black text-slate-950 outline-none" value={anchor.day?.id ?? ""} disabled={saving || loading} onChange={(event) => setDayId(event.target.value)}>{days.map((day) => <option key={day.id} value={day.id}>{spanishDate(day.date)}</option>)}</select></label>
              <button className={plannerButton} disabled={saving || loading || dayIndex >= days.length - 1} onClick={() => setDayId(days[dayIndex + 1].id)}>Día siguiente <ChevronRight size={18} /></button>
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {[
              ["Horarios", metrics.blocks, "del día"],
              ["Puntos", metrics.points, "configurados"],
              ["Asignaciones", metrics.assignments, "personas ubicadas"],
              ["Sin turno hoy", metrics.withoutTurn, "disponibles"],
              ["Menores pendientes", metrics.pendingMinors, "por completar"],
              ["Puntos incompletos", metrics.incompletePoints, "con una persona"],
            ].map(([label, value, note]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-black text-slate-950">{value}</p><p className="text-[10px] text-slate-500">{note}</p></article>)}
            <button type="button" onClick={openPendingPairs} disabled={!metrics.pendingPairs} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Vínculos pendientes</p><p className="text-lg font-black text-slate-950">{metrics.pendingPairs}</p><p className="text-[10px] text-slate-500">abrir casos</p></button>
          </section>

          <p role="status" className="text-sm text-slate-500">{saving ? "Guardando planificación…" : saved || (loading ? "Actualizando planificación…" : "El panel se actualiza mientras trabajas.")}</p>
          {!dayViews.length && <p className="rounded-xl border bg-white p-6">Este día todavía no tiene bloques activos para planificar.</p>}

          <div>
            <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[1040px] divide-y divide-slate-200">
                {dayViews.map((view, index) => {
                  const activePoints = view.points.filter((point) => point.active);
                  const covered = activePoints.filter((point) => point.slots.filter(Boolean).length >= 2).length;
                  const rowTone = !activePoints.length ? "bg-slate-50" : covered === activePoints.length ? "bg-emerald-50/80" : "bg-amber-50/75";
                  return (
                    <article key={view.block?.id} className="grid grid-cols-[112px_minmax(0,1fr)]">
                      <header className={`flex min-h-[120px] flex-col justify-center border-r border-slate-200 px-3 ${rowTone}`}>
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Clock3 size={13} /> Bloque {index + 1}</span>
                        <h2 className="mt-1 text-sm font-black tracking-tight text-slate-950">{view.block?.startTime}–<br />{view.block?.endTime}</h2>
                        <p className="mt-2 text-xs font-semibold text-slate-600">{covered}/{activePoints.length} puntos cubiertos</p>
                      </header>
                      <PlannerPoints view={view} saving={saving || loading} activate={(pointId, active) => void activate(view, pointId, active)} openSlot={(pointId, slotNumber) => openSlot(view, pointId, slotNumber)} change={(assignment, action) => start({ action, blockId: view.block!.id, person: assignment.person, assignment, pointId: assignment.pointId, slotNumber: assignment.slotNumber })} />
                    </article>
                  );
                })}
              </div>
            </section>

            {target && targetView && targetPoint && <>
              <button type="button" tabIndex={-1} className="fixed inset-0 z-40 cursor-default bg-slate-950/15" aria-label="Cerrar selector de participantes" onClick={() => setTarget(null)} />
              <aside role="dialog" aria-modal="true" aria-label="Añadir participante" className="fixed inset-y-0 right-0 z-50 w-full max-w-[390px] space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                <>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Añadir participante</p><h2 className="mt-1 font-black text-slate-950">{targetPoint.name}</h2><p className="mt-1 text-sm text-slate-500">{targetView.block?.startTime}–{targetView.block?.endTime}</p></div><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" onClick={() => setTarget(null)} aria-label="Cerrar selector"><X size={20} /></button></div>
                  <label className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar hermano" /></label>
                  {pairOnly && <button className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800" onClick={() => setPairOnly(false)}><Link2 size={12} /> Solo vínculos pendientes · Quitar filtro</button>}
                  <button className="text-sm font-semibold text-teal-800" onClick={() => setShowExceptions((current) => !current)}>{showExceptions ? "Ver solo disponibles" : "Usar excepción de disponibilidad"}</button>
                  {showExceptions && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Estas personas no marcaron este horario. El sistema pedirá una confirmación explícita.</p>}
                  <p className="text-xs text-slate-500">Primero aparecen quienes aún no tienen asignación este día. Los ya usados hoy quedan identificados.</p>
                  <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                    {!!withoutTurn.length && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">Sin turno hoy ({withoutTurn.length})</h3></div><ul className="space-y-2">{withoutTurn.map(candidateRow)}</ul></section>}
                    {!!withTurn.length && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">Ya participaron hoy ({withTurn.length})</h3></div><ul className="space-y-2">{withTurn.map(candidateRow)}</ul></section>}
                  </div>
                  {!candidates.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No hay hermanos disponibles para este bloque con esos criterios.</p>}
                </>
              </aside>
            </>}
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
