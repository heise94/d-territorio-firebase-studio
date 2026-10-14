"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  Presentation,
  Users,
} from "lucide-react";
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
import { CampaignTeam } from "./campaign-team";
import type { Campaign, CampaignDay } from "../domain/types";
const input =
  "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";
const button =
  "rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900";

function formatCampaignDates(dates: string[]) {
  if (!dates.length) return "Fechas por definir";
  const format = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${dates.at(-1)}T00:00:00Z`);
  if (dates.length === 1) return format.format(start);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const shortFormat = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return sameYear
    ? `${shortFormat.format(start)} – ${format.format(end)}`
    : `${format.format(start)} – ${format.format(end)}`;
}

function SouthernLandscape({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 320"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M0 172 137 105l114 72 115-105 103 109 108-80 102 86 131-153 165 153 121-81 129 80v134H0V172Z" fill="#b8d5cf" fillOpacity=".72" />
      <path d="m810 187 100-153 55 101-42-31-29 33-32-42-52 92Z" fill="#f8f6ed" fillOpacity=".92" />
      <path d="M0 208c139-54 242-31 345 2 118 39 236 33 347-9 126-48 270-50 392 9 116 56 231 41 356-1v111H0V208Z" fill="#84b4ac" fillOpacity=".42" />
      <path d="M0 239c143-31 275-23 411 9 143 34 278 37 422 4 178-40 370-45 607 7v61H0v-81Z" fill="#d7e8e3" fillOpacity=".92" />
      <path d="M0 263c176-23 325-19 478 6 183 31 341 27 509-3 181-33 330-29 453 1v53H0v-57Z" fill="#8ab9b1" fillOpacity=".45" />
      <path d="M0 290c141-28 274-16 395 9 131 27 262 28 405 4 207-35 426-40 640 0v17H0v-30Z" fill="#0d6264" fillOpacity=".74" />
      {[35, 77, 136, 196, 1180, 1234, 1293, 1354, 1405].map((x, index) => (
        <g key={x} opacity={index % 2 ? ".46" : ".58"}>
          <path d={`M${x} 303l${18 + (index % 3) * 5}-61 ${18 + (index % 3) * 5} 61H${x}Z`} fill="#064d51" />
          <rect x={x + 16} y="297" width="5" height="23" rx="2" fill="#064d51" />
        </g>
      ))}
    </svg>
  );
}
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
      <main className="relative isolate mx-auto min-h-[calc(100vh-5rem)] max-w-7xl space-y-7 overflow-hidden p-5 lg:p-9">
        {!creating && (
          <SouthernLandscape className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[clamp(11rem,26vh,16rem)] w-full opacity-70" />
        )}
        {creating ? (
          <header>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">
              Administración de plataforma
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Nueva campaña</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Define la información inicial. Después podrás configurar congregaciones, horarios y puntos.
            </p>
          </header>
        ) : (
          <header className="relative z-10 px-2 py-4 sm:px-3 lg:py-6">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">Administración de plataforma</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Campañas</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
                Crea tus campañas y entra a administrarlas cuando lo necesites.
              </p>
              <button
                className={`${button} mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
                onClick={() => {
                  setError("");
                  setCreating(true);
                }}
              >
                <Plus size={20} />
                Nueva campaña
              </button>
            </div>
          </header>
        )}
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
          <section className="relative z-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_16px_45px_-32px_rgba(15,23,42,.36)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 sm:px-7">
              <h2 className="text-xl font-bold tracking-tight">Tus campañas</h2>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                {items.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <CampaignListRow key={item.id} campaign={item} />
              ))}
              {items.length === 0 && <CampaignEmptyState onCreate={() => setCreating(true)} />}
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
    <article className="group flex flex-wrap items-center justify-between gap-5 px-6 py-6 transition-colors hover:bg-[#fcfcfa] sm:px-7">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-50 to-[#dff0ea] text-teal-800 shadow-inner">
          <Presentation size={27} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="break-words text-lg font-bold tracking-tight text-slate-950">{campaign.name}</h3>
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
              {formatCampaignDates(dates)}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={16} />
              {campaign.locationName || "Ubicación pendiente"}
            </span>
            <span className="inline-flex items-center gap-2"><Users size={16} />{count} {count === 1 ? "congregación" : "congregaciones"}</span>
          </div>
        </div>
      </div>
      <Link className={`${button} inline-flex items-center gap-2 rounded-xl px-4 py-2.5`} href={`/campanas/admin/resumen/${campaign.id}`}>
        Administrar <ArrowRight size={17} />
      </Link>
    </article>
  );
}

function CampaignEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative isolate overflow-hidden px-6 py-12 text-center sm:px-10">
      <SouthernLandscape className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 w-full opacity-35" />
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-800">
        <Presentation size={30} />
      </div>
      <h3 className="mt-5 text-xl font-bold tracking-tight">Aún no hay campañas</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        Crea tu primera campaña para comenzar.
      </p>
      <button className={`${button} mt-6 inline-flex items-center gap-2 rounded-xl`} onClick={onCreate}>
        <Plus size={18} /> Nueva campaña
      </button>
    </div>
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
              : "Consulta y administra la información, las congregaciones, el equipo y el estado de la campaña."}
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
            <Section title="Equipo de campaña">
              <CampaignTeam campaignId={campaign.id} />
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
