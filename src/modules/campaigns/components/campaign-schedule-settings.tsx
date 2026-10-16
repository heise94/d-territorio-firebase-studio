"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
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
import {
  checkBlocksOverlap,
  generateTimeBlocks,
  type GeneratedBlock,
} from "../domain/schedule-generator";

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
  const [blockForPoints, setBlockForPoints] = useState<TimeBlock | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      const dayMode = data.get("dayMode");
      if (dayMode === "copy") {
        const sourceDayId = String(data.get("sourceDayId") || "");
        if (!sourceDayId) {
          setError("Debes seleccionar un día existente para copiar.");
          return;
        }
        const parsed = campaignDaySchema.safeParse(payload);
        if (!parsed.success) return setError(parsed.error.issues[0].message);
        await save(
          () => repo.cloneDay(campaign.id, sourceDayId, parsed.data),
          true,
        );
        return;
      }
      const parsed = campaignDaySchema.safeParse(payload);
      if (!parsed.success) return setError(parsed.error.issues[0].message);
      await save(
        () => repo.saveDay(campaign.id, parsed.data, editor.value),
        true,
      );
    } else if (editor.kind === "block") {
      const blockMode = data.get("blockMode");
      if (blockMode === "auto" && !editor.value) {
        const startTime = String(data.get("autoStartTime") || "08:00");
        const durationHours = Number(data.get("autoDuration") || 2);
        const count = Number(data.get("autoCount") || 1);
        try {
          const generated = generateTimeBlocks(startTime, durationHours, count);
          await save(
            () =>
              repo.saveGeneratedBlocks(campaign.id, editor.dayId, generated),
            true,
          );
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Error al generar bloques.",
          );
        }
        return;
      }
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
        <span className="font-semibold">
          {days.length} {days.length === 1 ? "día" : "días"}
        </span>
        <span className="text-teal-400">·</span>
        <span className="font-semibold">
          {blocks.length} {blocks.length === 1 ? "bloque" : "bloques"}
        </span>
        <span className="text-teal-400">·</span>
        <span className="font-semibold">
          {points.length} {points.length === 1 ? "punto" : "puntos"}
        </span>
      </div>

      {error && !editor && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
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
                Define cuándo se realizará la campaña y cuántos hermanos pueden
                participar en cada punto.
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
              Todavía no hay días configurados. Agrega el primer día de la campaña
              para comenzar.
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
                            {dayBlocks.length}{" "}
                            {dayBlocks.length === 1
                              ? "bloque horario"
                              : "bloques horarios"}{" "}
                            ·{" "}
                            <span
                              className={`font-semibold ${
                                day.active ? "text-teal-800" : "text-slate-500"
                              }`}
                            >
                              {day.active ? "Activo" : "Inactivo"}
                            </span>
                          </span>
                        </span>
                        <ChevronDown
                          className={`ml-auto shrink-0 text-slate-600 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
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
                            if (
                              confirm(
                                "¿Eliminar este día y todos sus bloques asociados?",
                              )
                            )
                              void save(() => repo.deleteDay(day.id));
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {expanded[day.id] && (
                      <div
                        id={`blocks-${day.id}`}
                        className="space-y-2 bg-white p-3.5"
                      >
                        {!dayBlocks.length && (
                          <p className="py-2 text-center text-sm text-slate-500">
                            Este día todavía no tiene bloques de horario. Agrega
                            el primero a continuación.
                          </p>
                        )}

                        {dayBlocks.map((block) => {
                          const capacity = calculateBlockCapacity(
                            campaign.id,
                            block.id,
                            points,
                            blockPoints,
                          );

                          const capacityLabel =
                            capacity.minParticipants ===
                            capacity.maxParticipants
                              ? `${capacity.minParticipants} ${
                                  capacity.minParticipants === 1
                                    ? "hermano"
                                    : "hermanos"
                                }`
                              : `${capacity.minParticipants}–${capacity.maxParticipants} hermanos`;

                          return (
                            <div
                              key={block.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 transition-colors hover:bg-slate-50"
                            >
                              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                <strong className="text-sm font-bold text-slate-900">
                                  {block.startTime} – {block.endTime}
                                </strong>
                                {block.label && (
                                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                                    {block.label}
                                  </span>
                                )}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    block.active
                                      ? "bg-teal-50 text-teal-800"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {block.active ? "Activo" : "Inactivo"}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900">
                                  {capacity.activePointsCount}{" "}
                                  {capacity.activePointsCount === 1
                                    ? "punto activo"
                                    : "puntos activos"}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {capacityLabel}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  className={`${action} inline-flex items-center gap-1.5 border-teal-300 bg-teal-50/50 text-teal-900 hover:bg-teal-100/60`}
                                  disabled={disabled}
                                  onClick={() => setBlockForPoints(block)}
                                >
                                  <MapPin size={14} />
                                  <span>
                                    Puntos ({capacity.activePointsCount})
                                  </span>
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
              Todavía no hay puntos configurados. Crea los exhibidores o lugares
              físicos que se usarán en la campaña.
            </p>
          )}

          <div className="space-y-3">
            {points.map((point) => {
              const cap = getPointCapacity(point);
              const capacityLabel =
                cap.minParticipants === cap.maxParticipants
                  ? `${cap.minParticipants} ${
                      cap.minParticipants === 1 ? "hermano" : "hermanos"
                    }`
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
                          if (
                            confirm(
                              "¿Eliminar este punto y sus habilitaciones de la campaña?",
                            )
                          )
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
                : editor?.kind === "block"
                  ? "Configura los bloques horarios del día. Todos los puntos activos se habilitarán automáticamente."
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
              days={days}
              blocks={blocks}
              points={points}
              blockPoints={blockPoints}
            />
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DIALOG COMPACTO PARA PUNTOS POR BLOQUE */}
      <BlockPointsDialog
        block={blockForPoints}
        open={!!blockForPoints}
        onClose={() => setBlockForPoints(null)}
        points={points}
        blockPoints={blockPoints}
        busy={busy}
        onSave={async (pointStates) => {
          if (!blockForPoints) return;
          await save(
            () =>
              repo.saveBlockPointsForBlock(
                campaign.id,
                blockForPoints.id,
                pointStates,
              ),
            false,
          );
          setBlockForPoints(null);
        }}
      />
    </div>
  );
}

function ScheduleEntityForm({
  editor,
  busy,
  onSubmit,
  cancel,
  days,
  blocks,
  points,
  blockPoints,
}: {
  editor: Editor;
  busy: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  cancel: () => void;
  days: CampaignDay[];
  blocks: TimeBlock[];
  points: Point[];
  blockPoints: BlockPoint[];
}) {
  const initial = editor.value as unknown as
    | Record<string, unknown>
    | undefined;

  // Day modes: new vs copy
  const [dayMode, setDayMode] = useState<"new" | "copy">("new");
  const otherDays = days.filter((d) => d.id !== editor.value?.id);
  const [sourceDayId, setSourceDayId] = useState(otherDays[0]?.id ?? "");

  // Block modes: auto vs custom
  const [blockMode, setBlockMode] = useState<"auto" | "custom">("auto");
  const [autoStartTime, setAutoStartTime] = useState("08:00");
  const [autoDuration, setAutoDuration] = useState(2);
  const [autoCount, setAutoCount] = useState(5);

  const dayBlocks =
    editor.kind === "block"
      ? blocks.filter((b) => b.campaignDayId === editor.dayId)
      : [];

  // Live calculation for automatic block mode
  let generatedPreview: GeneratedBlock[] = [];
  let autoPreviewError: string | null = null;
  if (editor.kind === "block" && !editor.value && blockMode === "auto") {
    try {
      generatedPreview = generateTimeBlocks(
        autoStartTime,
        autoDuration,
        autoCount,
      );
      const overlap = checkBlocksOverlap(dayBlocks, generatedPreview);
      if (overlap) autoPreviewError = overlap;
    } catch (err) {
      autoPreviewError =
        err instanceof Error ? err.message : "Parámetros inválidos";
    }
  }

  // Live calculation for cloning day
  const sourceDayBlocks = blocks.filter((b) => b.campaignDayId === sourceDayId);
  const sourceBlockIds = new Set(sourceDayBlocks.map((b) => b.id));
  const configuredPointsInSource = new Set(
    blockPoints
      .filter((bp) => sourceBlockIds.has(bp.timeBlockId) && bp.active)
      .map((bp) => bp.pointId),
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {/* ================= DÍA ================= */}
        {editor.kind === "day" && (
          <>
            {!editor.value && otherDays.length > 0 && (
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Configuración de horarios
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    className={`rounded-md py-1.5 transition-colors ${
                      dayMode === "new"
                        ? "bg-white text-teal-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setDayMode("new")}
                  >
                    Crear horarios nuevos
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                      dayMode === "copy"
                        ? "bg-white text-teal-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setDayMode("copy")}
                  >
                    <Copy size={13} />
                    Copiar otro día
                  </button>
                </div>
                <input type="hidden" name="dayMode" value={dayMode} />
              </div>
            )}

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

            {!editor.value && dayMode === "copy" && otherDays.length > 0 && (
              <div className="space-y-3 sm:col-span-2">
                <label className="grid min-w-0 gap-1 text-sm font-semibold">
                  Copiar desde
                  <select
                    className={input}
                    name="sourceDayId"
                    value={sourceDayId}
                    onChange={(e) => setSourceDayId(e.target.value)}
                  >
                    {otherDays.map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatHumanDate(d.date)}
                        {d.label ? ` · ${d.label}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Confirmación de clonación */}
                <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-xs space-y-1">
                  <p className="font-bold text-teal-900">Se copiarán:</p>
                  <ul className="list-inside list-disc text-slate-700">
                    <li>
                      <strong>{sourceDayBlocks.length}</strong>{" "}
                      {sourceDayBlocks.length === 1
                        ? "bloque horario"
                        : "bloques horarios"}
                    </li>
                    <li>
                      <strong>{configuredPointsInSource.size}</strong>{" "}
                      {configuredPointsInSource.size === 1
                        ? "punto configurado"
                        : "puntos configurados"}
                    </li>
                  </ul>
                  <p className="pt-1 text-slate-500">
                    Podrás modificar esta configuración después. Solo se copiará
                    la estructura operativa, sin participantes ni asignaciones.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= BLOQUE HORARIO ================= */}
        {editor.kind === "block" && (
          <>
            {!editor.value && (
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Modo de creación
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors ${
                      blockMode === "auto"
                        ? "bg-white text-teal-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setBlockMode("auto")}
                  >
                    <Sparkles size={13} />
                    Automático (Recomendado)
                  </button>
                  <button
                    type="button"
                    className={`rounded-md py-1.5 transition-colors ${
                      blockMode === "custom"
                        ? "bg-white text-teal-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setBlockMode("custom")}
                  >
                    Personalizado
                  </button>
                </div>
                <input type="hidden" name="blockMode" value={blockMode} />
              </div>
            )}

            {!editor.value && blockMode === "auto" ? (
              <>
                <label className="grid min-w-0 gap-1 text-sm font-semibold">
                  Hora de inicio
                  <input
                    className={input}
                    name="autoStartTime"
                    required
                    type="time"
                    value={autoStartTime}
                    onChange={(e) => setAutoStartTime(e.target.value)}
                  />
                </label>

                <label className="grid min-w-0 gap-1 text-sm font-semibold">
                  Duración de cada bloque
                  <select
                    className={input}
                    name="autoDuration"
                    value={autoDuration}
                    onChange={(e) => setAutoDuration(Number(e.target.value))}
                  >
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={3}>3 horas</option>
                    <option value={4}>4 horas</option>
                  </select>
                </label>

                <label className="grid min-w-0 gap-1 text-sm font-semibold sm:col-span-2">
                  Cantidad de bloques
                  <input
                    className={input}
                    name="autoCount"
                    required
                    type="number"
                    min={1}
                    max={24}
                    value={autoCount}
                    onChange={(e) =>
                      setAutoCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </label>

                {/* VISTA PREVIA O ERROR */}
                <div className="sm:col-span-2">
                  {autoPreviewError ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                    >
                      {autoPreviewError}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 space-y-2">
                      <p className="text-xs font-bold text-teal-900">
                        Se crearán {generatedPreview.length}{" "}
                        {generatedPreview.length === 1 ? "bloque" : "bloques"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedPreview.map((b, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-teal-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                          >
                            {b.startTime} – {b.endTime}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-teal-800/80">
                        Todos los puntos activos de la campaña quedarán
                        habilitados por defecto para cada uno de estos bloques.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <label className="grid min-w-0 gap-1 text-sm font-semibold">
                  Hora de inicio
                  <input
                    className={input}
                    name="startTime"
                    required
                    type="time"
                    defaultValue={initial?.startTime?.toString() ?? "08:00"}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-sm font-semibold">
                  Hora de término
                  <input
                    className={input}
                    name="endTime"
                    required
                    type="time"
                    defaultValue={initial?.endTime?.toString() ?? "10:00"}
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
          </>
        )}

        {/* ================= PUNTO ================= */}
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
        <button
          className={primary}
          disabled={
            busy ||
            (editor.kind === "block" &&
              !editor.value &&
              blockMode === "auto" &&
              (!!autoPreviewError || generatedPreview.length === 0))
          }
        >
          {busy
            ? "Guardando…"
            : editor.kind === "point"
              ? "Guardar punto"
              : editor.kind === "day" && !editor.value && dayMode === "copy"
                ? "Crear día"
                : editor.kind === "block" && !editor.value && blockMode === "auto"
                  ? "Crear bloques"
                  : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function BlockPointsDialog({
  block,
  open,
  onClose,
  points,
  blockPoints,
  busy,
  onSave,
}: {
  block: TimeBlock | null;
  open: boolean;
  onClose: () => void;
  points: Point[];
  blockPoints: BlockPoint[];
  busy: boolean;
  onSave: (
    pointStates: Array<{ pointId: string; active: boolean }>,
  ) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!block) return;
    const initial: Record<string, boolean> = {};
    for (const pt of points) {
      const bp = blockPoints.find(
        (b) => b.timeBlockId === block.id && b.pointId === pt.id,
      );
      initial[pt.id] = bp ? bp.active : false;
    }
    setSelected(initial);
  }, [block, points, blockPoints]);

  if (!block) return null;

  const activePointsSelected = points.filter(
    (p) => p.active && selected[p.id],
  );
  let minTotal = 0;
  let maxTotal = 0;
  for (const p of activePointsSelected) {
    const cap = getPointCapacity(p);
    minTotal += cap.minParticipants;
    maxTotal += cap.maxParticipants;
  }

  function handleSelectAll() {
    const next: Record<string, boolean> = {};
    for (const p of points) {
      next[p.id] = p.active;
    }
    setSelected(next);
  }

  function handleDeselectAll() {
    const next: Record<string, boolean> = {};
    for (const p of points) {
      next[p.id] = false;
    }
    setSelected(next);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !busy && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Puntos: {block.startTime} – {block.endTime}
          </DialogTitle>
          <DialogDescription>
            Activa o desactiva los puntos habilitados para este bloque horario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
              onClick={handleSelectAll}
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
              onClick={handleDeselectAll}
            >
              Deseleccionar todos
            </button>
          </div>
          <div className="text-xs text-slate-600">
            <strong className="text-teal-900">
              {activePointsSelected.length}
            </strong>{" "}
            activos ·{" "}
            <strong className="text-teal-900">
              {minTotal === maxTotal ? `${minTotal}` : `${minTotal}–${maxTotal}`}{" "}
              hermanos
            </strong>
          </div>
        </div>

        {!points.length ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No hay puntos configurados en la campaña.
          </p>
        ) : (
          <div className="space-y-1.5 py-2">
            {points.map((pt) => {
              const cap = getPointCapacity(pt);
              const isChecked = !!selected[pt.id];

              return (
                <label
                  key={pt.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    !pt.active
                      ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                      : isChecked
                        ? "border-teal-300 bg-teal-50/50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-teal-800 focus:ring-teal-700 disabled:opacity-50"
                      checked={isChecked}
                      disabled={busy || !pt.active}
                      onChange={(e) =>
                        setSelected({ ...selected, [pt.id]: e.target.checked })
                      }
                    />
                    <span className="font-semibold text-slate-900 truncate">
                      {pt.name}
                    </span>
                    {!pt.active && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        inactivo global
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-medium text-teal-800">
                    {cap.minParticipants === cap.maxParticipants
                      ? `${cap.minParticipants} ${
                          cap.minParticipants === 1 ? "hermano" : "hermanos"
                        }`
                      : `${cap.minParticipants}–${cap.maxParticipants} hermanos`}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
          <button
            type="button"
            className={action}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={primary}
            disabled={busy}
            onClick={() =>
              void onSave(
                points.map((p) => ({
                  pointId: p.id,
                  active: !!selected[p.id],
                })),
              )
            }
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
