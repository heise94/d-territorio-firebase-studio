"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Plus, Presentation } from "lucide-react";
import { AdminDesktopShell } from "./admin-desktop-shell";
import {
  CampaignGeneralForm,
  CampaignCompanionSettings,
  CampaignInformationForm,
  CongregationSettings,
} from "./campaign-settings";
import { useAuth } from "@/hooks/use-auth";
import { campaignRepository as repo } from "../repositories/campaign-repository";
import { campaignSchema } from "../schemas/campaign-schemas";
import { CampaignScheduleSettings } from "./campaign-schedule-settings";
import { campaignStatusLabels as statusLabels } from "../lib/presentation";
import { CampaignStatusControls } from "./campaign-status-controls";
import type { Campaign, CampaignDay } from "../domain/types";
const input =
  "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";
const button =
  "rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900";
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
            <Section title="Participar con un compañero">
              <CampaignCompanionSettings campaign={campaign} onSaved={setCampaign} />
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
          <CampaignScheduleSettings campaign={campaign} />
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
