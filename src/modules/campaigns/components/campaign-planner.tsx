"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
class PlannerHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public warnings: PlannerWarningDTO[] = [],
  ) {
    super(message);
  }
}
export function CampaignPlanner({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<PlannerView | null>(null),
    [blockId, setBlockId] = useState(""),
    [selected, setSelected] = useState(""),
    [exceptionList, setExceptionList] = useState(false);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState("");
  const [decision, setDecision] = useState<PlannerDecision | null>(null),
    [warnings, setWarnings] = useState<PlannerWarningDTO[]>([]),
    [decisionError, setDecisionError] = useState("");
  const pending = useRef<AbortController | null>(null),
    mutation = useRef(false);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    if (!user) {
      setView(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken(true);
      if (controller.signal.aborted) return;
      const response = await fetch(
        `${base}/planner${blockId ? `?blockId=${encodeURIComponent(blockId)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new PlannerHttpError(data.error, response.status);
      if (!controller.signal.aborted) {
        setView(data);
        setError("");
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (
          failure instanceof PlannerHttpError &&
          [401, 403].includes(failure.status)
        ) {
          setView(null);
          setDecision(null);
        }
        setError(
          failure instanceof Error ? failure.message : "No se pudo actualizar.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [user, base, blockId]);
  useEffect(() => {
    setSelected("");
    setDecision(null);
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !mutation.current)
        void refresh();
    }, 12000);
    const visible = () => {
      if (document.visibilityState === "visible" && !mutation.current)
        void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      pending.current?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  async function write(path: string, method: string, input: unknown) {
    if (!user || mutation.current) return false;
    mutation.current = true;
    setSaving(true);
    setSaved("");
    try {
      const response = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${await user.getIdToken(true)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok)
        throw new PlannerHttpError(
          data.error,
          response.status,
          data.warnings ?? [],
        );
      setSaved("Guardado por el servidor.");
      await refresh();
      return true;
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  async function activate(pointId: string, active: boolean) {
    try {
      await write("/block-points", "POST", {
        timeBlockId: view!.block!.id,
        pointId,
        active,
      });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
      await refresh();
      if (failure instanceof Error) setError(failure.message);
    }
  }
  function start(value: PlannerDecision) {
    setDecision(value);
    setWarnings([]);
    setDecisionError("");
  }
  function assign(pointId: string, slotNumber: 1 | 2) {
    const person = [...view!.available, ...view!.exceptions].find(
      (item) => item.registrationId === selected,
    );
    if (person) start({ action: "create", person, pointId, slotNumber });
  }
  function change(assignment: PlannerAssignment, action: "move" | "cancel") {
    start({
      action,
      person: assignment.person,
      assignment,
      pointId: assignment.pointId,
      slotNumber: assignment.slotNumber,
    });
  }
  async function submit(
    pointId: string,
    slotNumber: 1 | 2,
    overrides: {
      registrationId: string;
      availability: boolean;
      maxTurns: boolean;
    }[],
  ) {
    if (!decision || !view?.block) return;
    setDecisionError("");
    try {
      const input =
        decision.action === "create"
          ? {
              timeBlockId: view.block.id,
              pointId,
              slotNumber,
              registrationId: decision.person.registrationId,
              overrides,
            }
          : {
              action: decision.action,
              expectedVersion: decision.assignment!.version,
              ...(decision.action === "move"
                ? { pointId, slotNumber, overrides }
                : {}),
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
        setSelected("");
      }
    } catch (failure) {
      if (failure instanceof PlannerHttpError && failure.status === 422)
        setWarnings(failure.warnings);
      setDecisionError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
      if (failure instanceof PlannerHttpError && failure.status !== 422) {
        await refresh();
        if ([401, 403].includes(failure.status)) setDecision(null);
      }
    }
  }
  const people = view ? (exceptionList ? view.exceptions : view.available) : [];
  const personCard = (person: PlannerPerson, selectable: boolean) => (
    <li
      key={person.registrationId}
      className={`space-y-1 rounded border p-3 ${selected === person.registrationId ? "border-teal-700 bg-teal-50" : "bg-white"}`}
    >
      <p className="font-medium">{person.fullName}</p>
      <p className="text-sm text-slate-600">
        {person.congregation} · {person.assignedTurns} turnos /{" "}
        {person.maxTurns ?? "sin límite"}
      </p>
      {person.accepted && (
        <p className="text-sm text-teal-900">
          Vínculo accepted: {person.accepted.otherName}
          {person.accepted.availabilityConflict
            ? " · SIN HORARIOS EN COMÚN"
            : person.accepted.blockAvailabilityConflict
              ? " · conflicto en este bloque"
              : ""}
        </p>
      )}
      {!person.profileActive && (
        <p className="text-sm text-amber-900">
          Perfil inactivo: requiere revisión.
        </p>
      )}
      {person.maxTurns !== null && person.assignedTurns >= person.maxTurns && (
        <p className="text-sm text-amber-900">Máximo de turnos alcanzado.</p>
      )}
      {selectable && (
        <button
          className={plannerButton}
          disabled={
            saving || loading || !view?.mutable || !person.profileActive
          }
          onClick={() => setSelected(person.registrationId)}
        >
          {selected === person.registrationId ? "Seleccionado" : "Seleccionar"}
        </button>
      )}
    </li>
  );
  return (
    <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
      <Link
        href={`/campanas/admin/participantes/${campaignId}`}
        className="text-teal-800"
      >
        ← Participantes y cobertura
      </Link>
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Planificador manual</h1>
        {view && (
          <>
            <h2 className="text-xl">
              {view.campaign.name} · {view.campaign.status}
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <label>
                Día
                <select
                  className="block rounded border p-2"
                  value={view.block?.dayId ?? ""}
                  disabled={saving}
                  onChange={(e) => {
                    const block = view.blocks.find(
                      (item) => item.dayId === e.target.value,
                    );
                    if (block) setBlockId(block.id);
                  }}
                >
                  {[
                    ...new Map(
                      view.blocks.map((block) => [block.dayId, block.date]),
                    ).entries(),
                  ].map(([id, date]) => (
                    <option key={id} value={id}>
                      {date}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bloque
                <select
                  className="block rounded border p-2"
                  value={view.block?.id ?? ""}
                  disabled={saving}
                  onChange={(e) => setBlockId(e.target.value)}
                >
                  {view.blocks
                    .filter((block) => block.dayId === view.block?.dayId)
                    .map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.startTime}–{block.endTime} {block.label}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className={plannerButton}
                disabled={
                  saving ||
                  view.blocks.findIndex(
                    (block) => block.id === view.block?.id,
                  ) <= 0
                }
                onClick={() =>
                  setBlockId(
                    view.blocks[
                      view.blocks.findIndex(
                        (block) => block.id === view.block?.id,
                      ) - 1
                    ].id,
                  )
                }
              >
                Anterior
              </button>
              <button
                className={plannerButton}
                disabled={
                  saving ||
                  view.blocks.findIndex(
                    (block) => block.id === view.block?.id,
                  ) >=
                    view.blocks.length - 1
                }
                onClick={() =>
                  setBlockId(
                    view.blocks[
                      view.blocks.findIndex(
                        (block) => block.id === view.block?.id,
                      ) + 1
                    ].id,
                  )
                }
              >
                Siguiente
              </button>
              <button
                className={plannerButton}
                disabled={saving || loading}
                onClick={() => void refresh()}
              >
                Actualizar bloque
              </button>
            </div>
            <p>
              Capacidad objetivo:{" "}
              <strong>{view.block?.capacity ?? "sin configurar"}</strong> ·
              Slots abiertos: <strong>{view.metrics.openSlots}</strong> (
              {view.metrics.activePoints} puntos × 2). No son la misma medida.
            </p>
            <p>
              Disponibilidad declarada: {view.metrics.available} · Asignados:{" "}
              {view.metrics.assigned} · Disponibles no asignados / Reserva:{" "}
              {view.metrics.reserve} · Reserva potencial por capacidad:{" "}
              {view.metrics.reservePotential ?? "sin configurar"}
            </p>
            {!view.mutable && (
              <p className="rounded bg-amber-50 p-3">
                Solo lectura. La planificación requiere estado planning y
                bloque/día activos.
              </p>
            )}
          </>
        )}
      </header>
      <p role="status" className="text-sm text-slate-600">
        {saving
          ? "Guardando…"
          : saved ||
            (loading
              ? "Actualizando bloque…"
              : view
                ? `Actualizado ${new Date(view.updatedAt).toLocaleTimeString("es-CL")}. Actualización cada 12 segundos mientras está visible.`
                : "Ingresa con tu cuenta administrativa.")}
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {view && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(420px,2fr)_minmax(240px,1fr)]">
          <section className="space-y-3 rounded-lg border bg-slate-50 p-4">
            <h2 className="text-xl font-bold">Disponibles</h2>
            <p className="text-sm">
              Disponibilidad declarada y aún sin asignación en este bloque.
              Orden alfabético, sin ranking.
            </p>
            <button
              className={plannerButton}
              disabled={saving}
              onClick={() => {
                setExceptionList(!exceptionList);
                setSelected("");
              }}
            >
              {exceptionList
                ? "Volver a disponibles"
                : "Asignar excepcionalmente"}
            </button>
            {exceptionList && (
              <p className="text-sm font-bold text-amber-900">
                SIN DISPONIBILIDAD. Requiere confirmación individual y
                auditoría.
              </p>
            )}
            <ul className="max-h-[70vh] space-y-3 overflow-y-auto">
              {people.map((person) => personCard(person, true))}
            </ul>
            {!people.length && (
              <p className="text-sm">No hay personas en esta lista.</p>
            )}
          </section>
          <PlannerPoints
            view={view}
            saving={saving || loading}
            selected={selected}
            activate={(id, active) => void activate(id, active)}
            assign={assign}
            change={change}
            complete={(assignment) => {
              const person = [...view.available, ...view.exceptions].find(
                (item) =>
                  item.registrationId ===
                  assignment.person.accepted?.otherRegistrationId,
              );
              if (person)
                start({
                  action: "create",
                  person,
                  pointId: assignment.pointId,
                  slotNumber: assignment.slotNumber === 1 ? 2 : 1,
                });
            }}
          />
          <aside className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <h2 className="text-xl font-bold">Contexto / Reserva</h2>
            <p className="text-sm">
              Reserva derivada: {view.metrics.reserve} disponibles sin asignar.
              No existe lista persistida ni recomendaciones.
            </p>
            <p>Puntos incompletos: {view.metrics.incompletePoints}</p>
            {view.conflicts.length > 0 && (
              <section>
                <h3 className="font-semibold">Conflictos operativos</h3>
                <ul className="space-y-2 text-sm text-amber-900">
                  {view.conflicts.map((conflict) => (
                    <li key={conflict}>{conflict}</li>
                  ))}
                </ul>
              </section>
            )}
            <h3 className="font-semibold">Reserva actual</h3>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {view.available.map((person) => personCard(person, false))}
            </ul>
          </aside>
        </div>
      )}
      {decision && view && (
        <PlannerDecisionDialog
          key={decision.action + decision.person.registrationId}
          decision={decision}
          view={view}
          saving={saving}
          warnings={warnings}
          error={decisionError}
          close={() => setDecision(null)}
          submit={(point, slot, overrides) =>
            void submit(point, slot, overrides)
          }
        />
      )}
    </main>
  );
}
