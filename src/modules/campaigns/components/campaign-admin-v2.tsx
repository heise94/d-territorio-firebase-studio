"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Plus, Presentation } from "lucide-react";
import { AdminDesktopShell } from "./admin-desktop-shell";
import {
  CampaignGeneralForm,
  CampaignInformationForm,
  CongregationSettings,
} from "./campaign-settings";
import { useAuth } from "@/hooks/use-auth";
import { campaignRepository as repo } from "../repositories/campaign-repository";
import {
  campaignDaySchema,
  campaignSchema,
  pointSchema,
  timeBlockSchema,
} from "../schemas/campaign-schemas";
import { CampaignStatusControls } from "./campaign-status-controls";
import type { Campaign, CampaignDay, Point, TimeBlock } from "../domain/types";
const input =
  "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";
const button =
  "rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900";
const statusLabels = {
  draft: "Borrador",
  registration_open: "Inscripciones abiertas",
  planning: "Planificación",
  published: "Publicado",
  active: "En curso",
  completed: "Finalizada",
};
function values(data: FormData) {
  return Object.fromEntries(data);
}
export function CampaignAdminV2() {
  const { user } = useAuth();
  const [items, setItems] = useState<Campaign[]>([]);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => repo.subscribeCampaigns(setItems), []);
  return (
    <AdminDesktopShell>
      <main className="mx-auto max-w-7xl space-y-7 p-5 lg:p-9">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">
              Administración de plataforma
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
              {creating ? "Nueva campaña" : "Campañas"}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              {creating
                ? "Define la información inicial. Después podrás configurar congregaciones, horarios y puntos."
                : "Crea y administra tus campañas. Entra a una campaña para trabajar en su planificación."}
            </p>
          </div>
          {!creating && (
            <button
              className={`${button} inline-flex items-center gap-2`}
              onClick={() => {
                setError("");
                setCreating(true);
              }}
            >
              <Plus size={20} />
              Nueva campaña
            </button>
          )}
        </header>
        {creating ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                const p = campaignSchema.safeParse({
                  ...values(f),
                  status: "draft",
                });
                if (!p.success) return setError(p.error.issues[0].message);
                if (!user || busy) return;
                setBusy(true);
                try {
                  const id = await repo.createCampaign(p.data, user.uid);
                  router.push(`/campanas/admin/campana/${id}`);
                } catch {
                  setError(
                    "No se pudo crear la campaña. Inténtalo nuevamente.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
            >
              <h2 className="text-xl font-bold md:col-span-2">
                Información general
              </h2>
              <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Nombre de campaña
                <input
                  className={input}
                  required
                  name="name"
                  maxLength={120}
                  placeholder="Ej. Campaña especial — Octubre"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Descripción breve
                <textarea
                  className="min-h-28 rounded-lg border border-slate-300 p-3"
                  name="description"
                  maxLength={500}
                  placeholder="Objetivo e información general de la campaña"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                Ubicación general
                <input
                  className={input}
                  name="locationName"
                  placeholder="Ciudad o lugar de la campaña"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Capacidad objetivo por bloque
                <input
                  className={input}
                  type="number"
                  min={0}
                  name="defaultCapacityPerBlock"
                  placeholder="Por definir"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Máximo de puntos
                <input
                  className={input}
                  type="number"
                  min={0}
                  name="maxPointsDefault"
                  placeholder="Por definir"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-700 md:col-span-2">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-3 border-t pt-5 md:col-span-2">
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  onClick={() => setCreating(false)}
                >
                  Cancelar
                </button>
                <button disabled={busy} className={button}>
                  {busy ? "Guardando…" : "Guardar campaña"}
                </button>
              </div>
            </form>
            <aside className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Configuración inicial</h2>
              <div className="my-5 flex items-center gap-3">
                <Presentation className="h-12 w-12 rounded-xl bg-teal-50 p-2 text-teal-800" />
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                  Borrador
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                La campaña se guardará como borrador. Configura sus días,
                bloques y puntos antes de abrir inscripciones.
              </p>
            </aside>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b p-5">
              <h2 className="text-xl font-bold">Tus campañas</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {items.length}
              </span>
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <CampaignListRow key={item.id} campaign={item} />
              ))}
              {items.length === 0 && (
                <p className="p-6 text-slate-600">
                  Todavía no hay campañas. Crea la primera para comenzar.
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </AdminDesktopShell>
  );
}
function CampaignListRow({ campaign }: { campaign: Campaign }) {
  const [days, setDays] = useState<CampaignDay[]>([]);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const stops = [
      repo.subscribeDays(campaign.id, setDays),
      repo.subscribeCampaignCongregations(campaign.id, (rows) =>
        setCount(rows.length),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [campaign.id]);
  const dates = days
    .filter((day) => day.active)
    .map((day) => day.date)
    .sort();
  return (
    <article className="flex flex-wrap items-center justify-between gap-5 p-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800">
          <Presentation size={32} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="break-words text-lg font-bold">{campaign.name}</h3>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              {statusLabels[campaign.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {campaign.description || "Sin descripción"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {dates.length
                ? `${dates[0]}${dates.length > 1 ? ` — ${dates.at(-1)}` : ""}`
                : "Fechas por definir"}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={16} />
              {campaign.locationName || "Ubicación por definir"}
            </span>
            <span>{count} congregaciones</span>
          </div>
        </div>
      </div>
      <Link className={button} href={`/campanas/admin/resumen/${campaign.id}`}>
        Administrar
      </Link>
    </article>
  );
}
export function CampaignEditor({
  campaign: initialCampaign,
  back,
  section = "general",
}: {
  campaign: Campaign;
  back: () => void;
  section?: string;
}) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [days, setDays] = useState<CampaignDay[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [editDay, setEditDay] = useState<CampaignDay>();
  const [editBlock, setEditBlock] = useState<TimeBlock>();
  const [editPoint, setEditPoint] = useState<Point>();
  const [err, setErr] = useState("");
  useEffect(() => {
    const s = [
      repo.subscribeDays(campaign.id, setDays),
      repo.subscribeBlocks(campaign.id, setBlocks),
      repo.subscribePoints(campaign.id, setPoints),
    ];
    return () => s.forEach((x) => x());
  }, [campaign.id]);
  const save = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 lg:p-9">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">
          {campaign.name}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          {section === "horarios"
            ? "Horarios y puntos"
            : section === "informacion"
              ? "Información para participantes"
              : "Campaña"}
        </h1>
        <p className="mt-3 text-slate-600">
          {section === "horarios"
            ? "Define los días, bloques de tiempo y puntos disponibles para la campaña."
            : section === "informacion"
              ? "Configura la información operativa que verán los participantes."
              : "Edita la información general y las congregaciones participantes."}
        </p>
      </header>
      {err && <p className="text-red-700">{err}</p>}
      {campaign.status === "completed" && (
        <p role="status">Campaña finalizada — solo lectura.</p>
      )}
      <fieldset
        disabled={campaign.status === "completed"}
        className="min-w-0 space-y-8"
      >
        {section === "general" && (
          <>
            <Section title="Información general">
              <CampaignGeneralForm campaign={campaign} onSaved={setCampaign} />
            </Section>
            <Section title="Congregaciones participantes">
              <CongregationSettings campaignId={campaign.id} />
            </Section>
            <CampaignStatusControls
              campaignId={campaign.id}
              status={campaign.status}
              onChanged={(status) => setCampaign({ ...campaign, status })}
            />
          </>
        )}
        {section === "informacion" && (
          <Section title="Información para participantes">
            <CampaignInformationForm
              campaign={campaign}
              onSaved={setCampaign}
            />
          </Section>
        )}
        {section === "horarios" && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <Section title="Días">
                <EntityForm
                  initial={
                    editDay
                      ? {
                          date: editDay.date,
                          label: editDay.label || "",
                          active: String(editDay.active),
                        }
                      : { date: "", label: "", active: "true" }
                  }
                  fields={["date", "label", "active"]}
                  submit="Guardar día"
                  cancel={() => setEditDay(undefined)}
                  onSubmit={(f) => {
                    const p = campaignDaySchema.safeParse({
                      ...values(f),
                      active: values(f).active === "true",
                    });
                    if (!p.success) return setErr(p.error.issues[0].message);
                    return save(() =>
                      repo.saveDay(campaign.id, p.data, editDay),
                    );
                  }}
                />
                {days.map((d) => (
                  <div className="admin-settings-row" key={d.id}>
                    <span>
                      {d.date} · {d.label || "Sin etiqueta"} ·{" "}
                      {d.active ? "Activo" : "Inactivo"}
                    </span>
                    <button onClick={() => setEditDay(d)}>Editar</button>
                    <button
                      onClick={() =>
                        save(() =>
                          repo.saveDay(
                            campaign.id,
                            { date: d.date, label: d.label, active: !d.active },
                            d,
                          ),
                        )
                      }
                    >
                      {d.active ? "Inactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() =>
                        confirm("¿Eliminar día y sus bloques?") &&
                        save(() => repo.deleteDay(d.id))
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </Section>
              <Section title="Bloques horarios">
                {days.map((day) => (
                  <div
                    className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    key={day.id}
                  >
                    <p className="font-bold text-teal-900">
                      {day.label || day.date} · {day.date}
                    </p>
                    <EntityForm
                      initial={
                        editBlock?.campaignDayId === day.id
                          ? {
                              startTime: editBlock.startTime,
                              endTime: editBlock.endTime,
                              label: editBlock.label || "",
                              capacityOverride:
                                editBlock.capacityOverride?.toString() || "",
                              active: String(editBlock.active),
                            }
                          : {
                              startTime: "",
                              endTime: "",
                              label: "",
                              capacityOverride: "",
                              active: "true",
                            }
                      }
                      fields={[
                        "startTime",
                        "endTime",
                        "label",
                        "capacityOverride",
                        "active",
                      ]}
                      submit="Guardar bloque"
                      cancel={() => setEditBlock(undefined)}
                      onSubmit={(f) => {
                        const p = timeBlockSchema.safeParse({
                          ...values(f),
                          active: values(f).active === "true",
                        });
                        if (!p.success)
                          return setErr(p.error.issues[0].message);
                        return save(() =>
                          repo.saveBlock(
                            campaign.id,
                            day.id,
                            p.data,
                            editBlock?.campaignDayId === day.id
                              ? editBlock
                              : undefined,
                          ),
                        );
                      }}
                    />
                    {blocks
                      .filter((b) => b.campaignDayId === day.id)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((b) => (
                        <div className="admin-settings-row" key={b.id}>
                          <span>
                            {b.startTime}–{b.endTime} · Meta{" "}
                            {b.capacityOverride ??
                              campaign.defaultCapacityPerBlock ??
                              "por definir"}{" "}
                            · {b.active ? "Activo" : "Inactivo"}
                          </span>
                          <button onClick={() => setEditBlock(b)}>
                            Editar
                          </button>
                          <button
                            onClick={() =>
                              save(() =>
                                repo.saveBlock(
                                  campaign.id,
                                  day.id,
                                  {
                                    startTime: b.startTime,
                                    endTime: b.endTime,
                                    label: b.label,
                                    capacityOverride: b.capacityOverride,
                                    active: !b.active,
                                  },
                                  b,
                                ),
                              )
                            }
                          >
                            {b.active ? "Inactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() =>
                              confirm("¿Eliminar bloque?") &&
                              save(() => repo.deleteBlock(b.id))
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                  </div>
                ))}
              </Section>
            </div>
            <div className="min-w-0">
              <Section title="Puntos / exhibidores">
                <EntityForm
                  initial={
                    editPoint
                      ? {
                          name: editPoint.name,
                          locationText: editPoint.locationText || "",
                          description: editPoint.description || "",
                          mapUrl: editPoint.mapUrl || "",
                          active: String(editPoint.active),
                        }
                      : {
                          name: "",
                          locationText: "",
                          description: "",
                          mapUrl: "",
                          active: "true",
                        }
                  }
                  fields={[
                    "name",
                    "locationText",
                    "description",
                    "mapUrl",
                    "active",
                  ]}
                  submit="Guardar punto"
                  cancel={() => setEditPoint(undefined)}
                  onSubmit={(f) => {
                    const p = pointSchema.safeParse({
                      ...values(f),
                      active: values(f).active === "true",
                    });
                    if (!p.success) return setErr(p.error.issues[0].message);
                    return save(() =>
                      repo.savePoint(campaign.id, p.data, editPoint),
                    );
                  }}
                />
                {points.map((p) => (
                  <div className="admin-settings-row" key={p.id}>
                    <span>
                      {p.name} · {p.active ? "Activo" : "Inactivo"}
                      {p.locationText && (
                        <small className="mt-1 block font-normal text-slate-500">
                          {p.locationText}
                        </small>
                      )}
                    </span>
                    <button onClick={() => setEditPoint(p)}>Editar</button>
                    <button
                      onClick={() =>
                        save(() =>
                          repo.savePoint(
                            campaign.id,
                            {
                              name: p.name,
                              locationText: p.locationText,
                              description: p.description,
                              mapUrl: p.mapUrl,
                              active: !p.active,
                            },
                            p,
                          ),
                        )
                      }
                    >
                      {p.active ? "Inactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() =>
                        confirm("¿Eliminar punto?") &&
                        save(() => repo.deletePoint(p.id))
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </Section>
              <p className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
                Estos son los puntos disponibles de la campaña. Su uso por
                bloque se define en Planificación.
              </p>
            </div>
          </div>
        )}
      </fieldset>
    </main>
  );
}
function Section(p: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">{p.title}</h2>
      {p.children}
    </section>
  );
}
function EntityForm({
  initial,
  fields,
  submit,
  onSubmit,
  cancel,
}: {
  initial: Record<string, string>;
  fields: string[];
  submit: string;
  onSubmit: (f: FormData) => void | Promise<void>;
  cancel: () => void;
}) {
  const fieldLabels: Record<string, string> = {
    date: "Fecha",
    label: "Etiqueta (opcional)",
    active: "Estado",
    startTime: "Hora de inicio",
    endTime: "Hora de término",
    capacityOverride: "Capacidad del bloque (opcional)",
    name: "Nombre",
    description: "Descripción (opcional)",
    locationText: "Ubicación (opcional)",
    mapUrl: "Enlace de mapa HTTPS (opcional)",
  };
  return (
    <form
      key={JSON.stringify(initial)}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="mt-4 grid items-end gap-3 sm:grid-cols-2"
    >
      {fields.map((k) => (
        <label key={k} className="grid min-w-0 gap-1 text-sm font-semibold">
          {fieldLabels[k] ?? k}
          {k === "active" ? (
            <select
              className={input}
              name="active"
              defaultValue={initial.active}
              key={k}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          ) : (
            <input
              className={input}
              key={k}
              name={k}
              required={
                k === "date" ||
                k === "startTime" ||
                k === "endTime" ||
                k === "name"
              }
              type={
                k === "date"
                  ? "date"
                  : k.includes("Time")
                    ? "time"
                    : k === "capacityOverride"
                      ? "number"
                      : "text"
              }
              defaultValue={initial[k]}
            />
          )}
        </label>
      ))}
      <button className={button}>{submit}</button>
      <button type="button" onClick={cancel}>
        Cancelar
      </button>
    </form>
  );
}
