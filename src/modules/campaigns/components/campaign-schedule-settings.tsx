"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, MapPin, Plus } from "lucide-react";
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
import type { Campaign, CampaignDay, Point, TimeBlock } from "../domain/types";

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

export function CampaignScheduleSettings({ campaign }: { campaign: Campaign }) {
  const [days, setDays] = useState<CampaignDay[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const readOnly = campaign.status === "completed";
  useEffect(() => {
    const subscriptions = [
      repo.subscribeDays(campaign.id, setDays),
      repo.subscribeBlocks(campaign.id, setBlocks),
      repo.subscribePoints(campaign.id, setPoints),
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
    <>
      {error && !editor && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Días y bloques{" "}
              <span className="text-sm font-normal text-slate-500">
                ({days.length})
              </span>
            </h2>
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
            <p className="py-4 text-slate-500">
              Todavía no hay días. Agrega el primero para configurar sus
              bloques.
            </p>
          )}
          <div className="space-y-3">
            {[...days]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => {
                const dayBlocks = blocks
                  .filter((block) => block.campaignDayId === day.id)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <article
                    key={day.id}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-50/70 p-3">
                      <button
                        type="button"
                        aria-expanded={!!expanded[day.id]}
                        aria-controls={`blocks-${day.id}`}
                        className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() =>
                          setExpanded({
                            ...expanded,
                            [day.id]: !expanded[day.id],
                          })
                        }
                      >
                        <CalendarDays
                          className="shrink-0 text-teal-800"
                          size={22}
                        />
                        <span className="min-w-0">
                          <strong className="block">
                            {day.date}
                            {day.label ? ` · ${day.label}` : ""}
                          </strong>
                          <span className="text-sm text-slate-600">
                            {day.active ? "Activo" : "Inactivo"} ·{" "}
                            {dayBlocks.length} bloques
                          </span>
                        </span>
                        <ChevronDown
                          className={`ml-auto shrink-0 transition ${expanded[day.id] ? "rotate-180" : ""}`}
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
                          className={`${action} text-red-700`}
                          disabled={disabled}
                          onClick={() => {
                            if (confirm("¿Eliminar día y sus bloques?"))
                              void save(() => repo.deleteDay(day.id));
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {expanded[day.id] && (
                      <div id={`blocks-${day.id}`} className="space-y-2 p-3">
                        {!dayBlocks.length && (
                          <p className="py-2 text-sm text-slate-500">
                            Este día todavía no tiene bloques.
                          </p>
                        )}
                        {dayBlocks.map((block) => (
                          <div
                            key={block.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                          >
                            <p className="min-w-0">
                              <strong>
                                {block.startTime}–{block.endTime}
                              </strong>
                              {block.label && (
                                <span className="ml-2 text-sm">
                                  {block.label}
                                </span>
                              )}
                              <span className="mt-1 block text-sm text-slate-500">
                                Meta{" "}
                                {block.capacityOverride ??
                                  campaign.defaultCapacityPerBlock ??
                                  "por definir"}{" "}
                                personas ·{" "}
                                {block.active ? "Activo" : "Inactivo"}
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-2">
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
                                Editar bloque
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
                                        capacityOverride:
                                          block.capacityOverride,
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
                                className={`${action} text-red-700`}
                                disabled={disabled}
                                onClick={() => {
                                  if (confirm("¿Eliminar bloque?"))
                                    void save(() => repo.deleteBlock(block.id));
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className={`${action} flex w-full items-center justify-center gap-2 border-dashed`}
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
          <p className="mt-4 text-sm text-slate-500">
            Abre un día para ver y administrar sus bloques.
          </p>
        </section>
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                Puntos / exhibidores{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({points.length})
                </span>
              </h2>
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
              <p className="py-4 text-slate-500">
                Todavía no hay puntos configurados.
              </p>
            )}
            <div className="space-y-3">
              {points.map((point) => (
                <article
                  key={point.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex min-w-[150px] flex-1 items-start gap-3">
                    <span className="rounded-full bg-teal-50 p-2 text-teal-800">
                      <MapPin size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{point.name}</h3>
                      {point.locationText && (
                        <p className="break-words text-sm text-slate-500">
                          {point.locationText}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${point.active ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {point.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={action}
                      disabled={disabled}
                      onClick={() => open({ kind: "point", value: point })}
                    >
                      Editar punto
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
                      className={`${action} text-red-700`}
                      disabled={disabled}
                      onClick={() => {
                        if (confirm("¿Eliminar punto?"))
                          void save(() => repo.deletePoint(point.id));
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
            Estos son los puntos disponibles de la campaña. Su uso por bloque se
            define en Planificación.
          </p>
        </div>
      </div>
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
                  ? "bloque"
                  : "punto"}
            </DialogTitle>
            <DialogDescription>
              Guarda los datos de este elemento. Los demás elementos no se
              modifican.
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
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
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
  const fields: Record<string, string> =
    editor.kind === "day"
      ? { date: "Fecha", label: "Etiqueta (opcional)" }
      : editor.kind === "block"
        ? {
            startTime: "Hora de inicio",
            endTime: "Hora de término",
            label: "Etiqueta (opcional)",
            capacityOverride: "Capacidad del bloque (opcional)",
          }
        : {
            name: "Nombre",
            locationText: "Ubicación (opcional)",
            description: "Descripción (opcional)",
            mapUrl: "Enlace de mapa HTTPS (opcional)",
          };
  const initial = editor.value as unknown as
    Record<string, unknown> | undefined;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {Object.entries(fields).map(([field, label]) => (
          <label
            key={field}
            className="grid min-w-0 gap-1 text-sm font-semibold"
          >
            {label}
            <input
              className={input}
              name={field}
              required={["date", "startTime", "endTime", "name"].includes(
                field,
              )}
              type={
                field === "date"
                  ? "date"
                  : field.endsWith("Time")
                    ? "time"
                    : field === "capacityOverride"
                      ? "number"
                      : "text"
              }
              min={field === "capacityOverride" ? 0 : undefined}
              defaultValue={initial?.[field]?.toString() ?? ""}
            />
          </label>
        ))}
        <label className="grid gap-1 text-sm font-semibold">
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
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
