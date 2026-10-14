"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, MapPin, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { campaignRepository as repo } from "../repositories/campaign-repository";
import {
  campaignDaySchema,
  pointSchema,
  timeBlockSchema,
} from "../schemas/campaign-schemas";
import type {
  BlockPoint,
  Campaign,
  CampaignDay,
  Point,
  TimeBlock,
} from "../domain/types";
import {
  calculateBlockCapacity,
  getPointCapacity,
} from "../domain/point-capacity";

type Editor =
  | { kind: "day"; value?: CampaignDay }
  | { kind: "block"; dayId: string; value?: TimeBlock }
  | { kind: "point"; value?: Point };

const action =
  "min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
const primary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50";
const input =
  "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";

export function formatHumanDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const formatted = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
      .format(date)
      .replace(",", "");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
}

export function CampaignScheduleSettings({ campaign }: { campaign: Campaign }) {
  const [days, setDays] = useState<CampaignDay[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [blockPoints, setBlockPoints] = useState<BlockPoint[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const readOnly = campaign.status === "completed";

  useEffect(() => {
    const subscriptions = [
      repo.subscribeDays(campaign.id, setDays),
      repo.subscribeBlocks(campaign.id, setBlocks),
      repo.subscribePoints(campaign.id, setPoints),
      repo.subscribeBlockPoints(campaign.id, setBlockPoints),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [campaign.id]);

  async function save(operation: () => Promise<unknown>, close = false) {
    if (busy || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await operation();
      if (close) setEditor(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
    } finally {
      setBusy(false);
    }
  }

  function open(next: Editor) {
    setError("");
    setEditor(next);
  }

  async function submit(data: FormData) {
    if (!editor) return;
    const payload = {
      ...Object.fromEntries(data),
      active: data.get("active") === "true",
    };
    if (editor.kind === "day") {
      const parsed = campaignDaySchema.safeParse(payload);
      if (!parsed.success) return setError(parsed.error.issues[0].message);
      await save(
        () => repo.saveDay(campaign.id, parsed.data, editor.value),
        true,
      );
    } else if (editor.kind === "block") {
      const parsed = timeBlockSchema.safeParse(payload);
      if (!parsed.success) return setError(parsed.error.issues[0].message);
      await save(
        () =>
          repo.saveBlock(campaign.id, editor.dayId, parsed.data, editor.value),
        true,
      );
    } else {
      const parsed = pointSchema.safeParse(payload);
      if (!parsed.success) return setError(parsed.error.issues[0].message);
      await save(
        () => repo.savePoint(campaign.id, parsed.data, editor.value),
        true,
      );
    }
  }

  const disabled = busy || readOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-2.5 text-sm font-medium text-teal-950">
        <span className="font-semibold">{days.length} {days.length === 1 ? "día" : "días"}</span>
        <span className="text-teal-400">·</span>
        <span className="font-semibold">{blocks.length} {blocks.length === 1 ? "bloque" : "bloques"}</span>
        <span className="text-teal-400">·</span>
        <span className="font-semibold">{points.length} {points.length === 1 ? "punto" : "puntos"}</span>
      </div>

      {error && !editor && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* COLUMNA 1: DÍAS Y HORARIOS */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Días{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({days.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Configura los días operativos y despliega sus bloques de tiempo.
              </p>
            </div>
            <button
              type="button"
              className={primary}
              disabled={disabled}
              onClick={() => open({ kind: "day" })}
            >
              <Plus size={18} /> Agregar día
            </button>
          </header>

          {!days.length && (
            <p className="py-6 text-center text-sm text-slate-500">
              Todavía no hay días configurados. Agrega el primer día de la campaña para comenzar.
            </p>
          )}

          <div className="space-y-3">
            {[...days]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => {
                const dayBlocks = blocks
                  .filter((block) => block.campaignDayId === day.id)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isExpanded = !!expanded[day.id];

                return (
                  <article
                    key={day.id}
                    className="overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-50/70 p-3.5">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`blocks-${day.id}`}
                        className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() =>
                          setExpanded({
                            ...expanded,
                            [day.id]: !isExpanded,
                          })
                        }
                      >
                        <CalendarDays
                          className="shrink-0 text-teal-800"
                          size={22}
                        />
                        <span className="min-w-0">
                          <strong className="block text-base font-bold text-slate-900">
                            {formatHumanDate(day.date)}
                            {day.label ? ` · ${day.label}` : ""}
                          </strong>
                          <span className="text-xs text-slate-600">
                            {dayBlocks.length} {dayBlocks.length === 1 ? "bloque horario" : "bloques horarios"} ·{" "}
                            <span
                              className={`font-semibold ${day.active ? "text-teal-800" : "text-slate-500"}`}
                            >
                              {day.active ? "Activo" : "Inactivo"}
                            </span>
                          </span>
                        </span>
                        <ChevronDown
                          className={`ml-auto shrink-0 text-slate-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          size={18}
                        />
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={action}
                          disabled={disabled}
                          onClick={() => open({ kind: "day", value: day })}
                        >
                          Editar día
                        </button>
                        <button
                          type="button"
                          className={action}
                          disabled={disabled}
                          onClick={() =>
                            void save(() =>
                              repo.saveDay(
                                campaign.id,
                                {
                                  date: day.date,
                                  label: day.label,
                                  active: !day.active,
                                },
                                day,
                              ),
                            )
                          }
                        >
                          {day.active ? "Inactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className={`${action} text-red-700 hover:bg-red-50`}
                          disabled={disabled}
                          onClick={() => {
                            if (confirm("¿Eliminar este día y todos sus bloques asociados?"))
                              void save(() => repo.deleteDay(day.id));
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {expanded[day.id] && (
                      <div id={`blocks-${day.id}`} className="space-y-3 bg-white p-3.5">
                        {!dayBlocks.length && (
                          <p className="py-2 text-center text-sm text-slate-500">
                            Este día todavía no tiene bloques de horario. Agrega el primero a continuación.
                          </p>
                        )}

                        {dayBlocks.map((block) => {
                          const capacity = calculateBlockCapacity(
                            campaign.id,
                            block.id,
                            points,
                            blockPoints,
                          );
                          const isBlockPointsOpen = !!expandedBlocks[block.id];

                          return (
                            <div
                              key={block.id}
                              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong className="text-base font-bold text-slate-900">
                                      {block.startTime} – {block.endTime}
                                    </strong>
                                    {block.label && (
                                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                                        {block.label}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${block.active ? "bg-teal-50 text-teal-800" : "bg-slate-200 text-slate-600"}`}
                                    >
                                      {block.active ? "Activo" : "Inactivo"}
                                    </span>
                                  </div>

                                  {/* Capacidad automática calculada a partir de los puntos */}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                    <span className="font-semibold text-slate-900">
                                      {capacity.activePointsCount}{" "}
                                      {capacity.activePointsCount === 1 ? "punto activo" : "puntos activos"}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Mínimo necesario:{" "}
                                      <strong className="font-bold text-teal-900">
                                        {capacity.minParticipants} {capacity.minParticipants === 1 ? "hermano" : "hermanos"}
                                      </strong>
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Capacidad máxima:{" "}
                                      <strong className="font-bold text-teal-900">
                                        {capacity.maxParticipants} {capacity.maxParticipants === 1 ? "hermano" : "hermanos"}
                                      </strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className={`${action} inline-flex items-center gap-1.5 ${isBlockPointsOpen ? "bg-teal-50 text-teal-900 border-teal-300" : ""}`}
                                    disabled={disabled}
                                    onClick={() =>
                                      setExpandedBlocks({
                                        ...expandedBlocks,
                                        [block.id]: !isBlockPointsOpen,
                                      })
                                    }
                                  >
                                    <MapPin size={15} />
                                    <span>Puntos ({capacity.activePointsCount})</span>
                                    <ChevronDown
                                      size={15}
                                      className={`transition-transform ${isBlockPointsOpen ? "rotate-180" : ""}`}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className={action}
                                    disabled={disabled}
                                    onClick={() =>
                                      open({
                                        kind: "block",
                                        dayId: day.id,
                                        value: block,
                                      })
                                    }
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={action}
                                    disabled={disabled}
                                    onClick={() =>
                                      void save(() =>
                                        repo.saveBlock(
                                          campaign.id,
                                          day.id,
                                          {
                                            startTime: block.startTime,
                                            endTime: block.endTime,
                                            label: block.label,
                                            active: !block.active,
                                          },
                                          block,
                                        ),
                                      )
                                    }
                                  >
                                    {block.active ? "Inactivar" : "Activar"}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${action} text-red-700 hover:bg-red-50`}
                                    disabled={disabled}
                                    onClick={() => {
                                      if (confirm("¿Eliminar este bloque horario?"))
                                        void save(() => repo.deleteBlock(block.id));
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>

                              {/* Puntos habilitados para este horario */}
                              {isBlockPointsOpen && (
                                <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                                      Puntos habilitados para este horario
                                    </h4>
                                    <span className="text-xs text-slate-500">
                                      Tildar para operar este punto en {block.startTime}–{block.endTime}
                                    </span>
                                  </div>

                                  {!points.length && (
                                    <p className="py-2 text-xs text-slate-500">
                                      No hay puntos creados en la campaña. Agrégalos en la columna derecha para habilitarlos aquí.
                                    </p>
                                  )}

                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {points.map((point) => {
                                      const cap = getPointCapacity(point);
                                      const isPointEnabledInBlock = blockPoints.some(
                                        (bp) =>
                                          bp.campaignId === campaign.id &&
                                          bp.timeBlockId === block.id &&
                                          bp.pointId === point.id &&
                                          bp.active,
                                      );

                                      return (
                                        <label
                                          key={point.id}
                                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                                            !point.active
                                              ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                                              : isPointEnabledInBlock
                                                ? "border-teal-300 bg-teal-50/50 text-slate-900"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="mt-0.5 rounded border-slate-300 text-teal-800 focus:ring-teal-700 disabled:opacity-50"
                                            checked={isPointEnabledInBlock}
                                            disabled={disabled || !point.active}
                                            onChange={() =>
                                              void save(() =>
                                                repo.saveBlockPoint(
                                                  campaign.id,
                                                  block.id,
                                                  point.id,
                                                  !isPointEnabledInBlock,
                                                ),
                                              )
                                            }
                                          />
                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-900">
                                              {point.name}
                                              {!point.active && (
                                                <span className="ml-1 text-[11px] font-normal text-slate-500">
                                                  (inactivo global)
                                                </span>
                                              )}
                                            </p>
                                            {point.locationText && (
                                              <p className="truncate text-slate-500">
                                                {point.locationText}
                                              </p>
                                            )}
                                            <p className="mt-0.5 text-teal-800 font-medium">
                                              {cap.minParticipants === cap.maxParticipants
                                                ? `${cap.minParticipants} ${cap.minParticipants === 1 ? "hermano" : "hermanos"}`
                                                : `${cap.minParticipants}–${cap.maxParticipants} hermanos`}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          className={`${action} flex w-full items-center justify-center gap-2 border-dashed py-2.5 text-teal-900`}
                          disabled={disabled}
                          onClick={() => open({ kind: "block", dayId: day.id })}
                        >
                          <Plus size={18} /> Agregar bloque a este día
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </section>

        {/* COLUMNA 2: PUNTOS DE LA CAMPAÑA */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Puntos de la campaña{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({points.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Crea aquí los lugares que pueden utilizarse durante la campaña.
              </p>
            </div>
            <button
              type="button"
              className={primary}
              disabled={disabled}
              onClick={() => open({ kind: "point" })}
            >
              <Plus size={18} /> Agregar punto
            </button>
          </header>

          {!points.length && (
            <p className="py-6 text-center text-sm text-slate-500">
              Todavía no hay puntos configurados. Crea los exhibidores o lugares físicos que se usarán en la campaña.
            </p>
          )}

          <div className="space-y-3">
            {points.map((point) => {
              const cap = getPointCapacity(point);
              const capacityLabel =
                cap.minParticipants === cap.maxParticipants
                  ? `${cap.minParticipants} ${cap.minParticipants === 1 ? "hermano" : "hermanos"}`
                  : `${cap.minParticipants}–${cap.maxParticipants} hermanos`;

              return (
                <article
                  key={point.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 transition-shadow hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-[160px] flex-1 items-start gap-3">
                      <span className="rounded-full bg-teal-50 p-2 text-teal-800">
                        <MapPin size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{point.name}</h3>
                          <span className="rounded-md border border-teal-200 bg-teal-50/70 px-2 py-0.5 text-xs font-semibold text-teal-900">
                            {capacityLabel}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              point.active
                                ? "bg-teal-50 text-teal-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {point.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        {point.locationText && (
                          <p className="mt-0.5 text-xs font-medium text-slate-600">
                            {point.locationText}
                          </p>
                        )}
                        {point.description && (
                          <p className="mt-1 text-xs text-slate-500">
                            {point.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={action}
                        disabled={disabled}
                        onClick={() => open({ kind: "point", value: point })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={action}
                        disabled={disabled}
                        onClick={() =>
                          void save(() =>
                            repo.savePoint(
                              campaign.id,
                              {
                                name: point.name,
                                locationText: point.locationText,
                                description: point.description,
                                mapUrl: point.mapUrl,
                                minParticipants: point.minParticipants,
                                maxParticipants: point.maxParticipants,
                                active: !point.active,
                              },
                              point,
                            ),
                          )
                        }
                      >
                        {point.active ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        className={`${action} text-red-700 hover:bg-red-50`}
                        disabled={disabled}
                        onClick={() => {
                          if (confirm("¿Eliminar este punto y sus habilitaciones de la campaña?"))
                            void save(() => repo.deletePoint(point.id));
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* MODAL DIALOG PARA CREAR/EDITAR DÍA, BLOQUE O PUNTO */}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-white text-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.value ? "Editar" : "Agregar"}{" "}
              {editor?.kind === "day"
                ? "día"
                : editor?.kind === "block"
                  ? "bloque horario"
                  : "punto"}
            </DialogTitle>
            <DialogDescription>
              {editor?.kind === "point"
                ? "Configura los datos del punto y la cantidad de hermanos necesaria para operarlo."
                : "Guarda los datos de este elemento. Los demás elementos no se modifican."}
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <ScheduleEntityForm
              key={`${editor.kind}-${editor.value?.id ?? "new"}`}
              editor={editor}
              busy={busy}
              onSubmit={submit}
              cancel={() => setEditor(null)}
            />
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleEntityForm({
  editor,
  busy,
  onSubmit,
  cancel,
}: {
  editor: Editor;
  busy: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  cancel: () => void;
}) {
  const initial = editor.value as unknown as
    | Record<string, unknown>
    | undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {editor.kind === "day" && (
          <>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Fecha
              <input
                className={input}
                name="date"
                required
                type="date"
                defaultValue={initial?.date?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Etiqueta (opcional)
              <input
                className={input}
                name="label"
                type="text"
                placeholder="ej. Lanzamiento de campaña"
                defaultValue={initial?.label?.toString() ?? ""}
              />
            </label>
          </>
        )}

        {editor.kind === "block" && (
          <>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Hora de inicio
              <input
                className={input}
                name="startTime"
                required
                type="time"
                defaultValue={initial?.startTime?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Hora de término
              <input
                className={input}
                name="endTime"
                required
                type="time"
                defaultValue={initial?.endTime?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Etiqueta (opcional)
              <input
                className={input}
                name="label"
                type="text"
                placeholder="ej. Turno mañana"
                defaultValue={initial?.label?.toString() ?? ""}
              />
            </label>
          </>
        )}

        {editor.kind === "point" && (
          <>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Nombre del punto
              <input
                className={input}
                name="name"
                required
                type="text"
                placeholder="ej. Acceso principal"
                defaultValue={initial?.name?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Ubicación o referencia
              <input
                className={input}
                name="locationText"
                type="text"
                placeholder="ej. Portón norte, junto a la estación"
                defaultValue={initial?.locationText?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Descripción
              <input
                className={input}
                name="description"
                type="text"
                placeholder="Detalles sobre el entorno o instrucciones"
                defaultValue={initial?.description?.toString() ?? ""}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Mínimo de hermanos
              <input
                className={input}
                name="minParticipants"
                required
                type="number"
                min={1}
                defaultValue={initial?.minParticipants?.toString() ?? "2"}
              />
              <span className="text-xs font-normal text-slate-500">
                Mínimo necesario para operar (default: 2)
              </span>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Máximo de hermanos
              <input
                className={input}
                name="maxParticipants"
                required
                type="number"
                min={1}
                defaultValue={initial?.maxParticipants?.toString() ?? "2"}
              />
              <span className="text-xs font-normal text-slate-500">
                Máximo razonable para el punto (default: 2)
              </span>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
              Enlace de mapa HTTPS (opcional)
              <input
                className={input}
                name="mapUrl"
                type="url"
                placeholder="https://maps.google.com/?q=..."
                defaultValue={initial?.mapUrl?.toString() ?? ""}
              />
            </label>
          </>
        )}

        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
          Estado
          <select
            className={input}
            name="active"
            defaultValue={String(initial?.active ?? true)}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          className={action}
          disabled={busy}
          onClick={cancel}
        >
          Cancelar
        </button>
        <button className={primary} disabled={busy}>
          {busy
            ? "Guardando…"
            : editor.kind === "point"
              ? "Guardar punto"
              : "Guardar"}
        </button>
      </div>
    </form>
  );
}
