"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Share2,
  UsersRound,
} from "lucide-react";
import { campaignFetch } from "../lib/campaign-fetch";
import {
  normalizeChileanPhone,
  organizerPhoneDigits,
} from "../schemas/participant-auth";
import { joinShareUrl } from "../lib/public-join";
import { AvailabilitySummary } from "./availability-summary";
import type { PlannerAssignment, PlannerDayView, PlannerView, PlannerWarningDTO } from "../domain/planner";
import { organizationPlannerBlock, organizationPlannerBlockLabel, organizationPlannerCandidates } from "../lib/organization-planner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type Block = {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  available?: boolean;
  published?: boolean;
  minimum?: number;
  missing?: number;
  state?: string;
  count?: number;
  companions?: string[];
};
type Day = {
  id: string;
  date: string;
  label: string;
  blocks: Block[];
  count?: number;
};
type Overview = {
  campaign: { name: string; roleLabel: string; status: string };
  participantCount: number;
  days: Day[];
  coverageSummary: { total: number; missing: number };
};
type Row = {
  registrationId: string;
  fullName: string;
  congregation: string;
  congregationId: string | null;
};
type Detail = {
  registrationId: string;
  fullName: string;
  phone: string;
  congregation: string;
  partner: { fullName: string; congregation: string } | null;
  days: Day[];
};
type Cong = { id: string; name: string; count?: number };
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base";
const date = (v: string) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${v}T12:00:00`));
export function OrganizationPwa({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<
      "Inicio" | "Participantes" | "Agregar" | "Cobertura" | "Planificador"
    >("Inicio"),
    [overview, setOverview] = useState<Overview | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState("");
  const load = () =>
    campaignFetch(`/api/campanas/organization/campaigns/${campaignId}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setOverview(b);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
  }, [campaignId]);
  if (error)
    return (
      <main className="campaign-page p-8">
        <p role="alert">{error}</p>
      </main>
    );
  if (!overview)
    return <main className="campaign-page p-8">Cargando Organización…</main>;
  const open = (id: string) => {
    setSelected(id);
    setTab("Participantes");
  };
  const content =
    tab === "Inicio" ? (
      <Home id={campaignId} o={overview} go={setTab} />
    ) : tab === "Participantes" ? (
      <PeopleV2
        id={campaignId}
        initial={selected}
        clear={() => setSelected(null)}
      />
    ) : tab === "Agregar" ? (
      <Add id={campaignId} o={overview} done={open} />
    ) : tab === "Cobertura" ? (
      <Coverage id={campaignId} open={open} />
    ) : (
      <OrganizationPlanner id={campaignId} />
    );
  return (
    <main className="campaign-page space-y-5 pb-28">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-teal-700">
            Modo organización
          </p>
          <h1 className="truncate text-2xl font-bold">
            {overview.campaign.name}
          </h1>
          <span className="inline-flex rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">
            {overview.campaign.roleLabel}
          </span>
        </div>
        <Link
          className="campaign-secondary shrink-0 px-3 text-sm"
          href="/campanas"
        >
          <ChevronLeft className="h-4 w-4" />
          Salir del modo organización
        </Link>
      </header>
      {content}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-xl grid-cols-5 border-t bg-white px-1 pb-3 pt-2">
        {(
          [
            ["Inicio", ClipboardList],
            ["Participantes", UsersRound],
            ["Agregar", Plus],
            ["Cobertura", CalendarDays],
            ["Planificador", ClipboardCheck],
          ] as const
        ).map(([l, I]) => (
          <button
            key={l}
            onClick={() => setTab(l)}
            className={`min-h-14 rounded-xl text-xs font-semibold ${tab === l ? "bg-teal-100 text-teal-800" : "text-slate-600"}`}
          >
            <I className="mx-auto mb-1 h-5 w-5" />
            {l}
          </button>
        ))}
      </nav>
    </main>
  );
}
function Home({
  id,
  o,
  go,
}: {
  id: string;
  o: Overview;
  go: (v: "Inicio" | "Participantes" | "Agregar" | "Cobertura" | "Planificador") => void;
}) {
  const missing = o.coverageSummary.missing;
  return (
    <section className="space-y-4">
      <article className="campaign-surface grid grid-cols-3 divide-x p-4 text-center">
        <div>
          <b className="block text-xl">{o.participantCount}</b>
          <span className="text-xs">inscritos</span>
        </div>
        <div>
          <b className="block text-xl">{missing || "✓"}</b>
          <span className="text-xs">
            {missing ? "necesitan apoyo" : "todos cubiertos"}
          </span>
        </div>
        <div>
          <b className="block text-sm">
            {o.campaign.status === "registration_open"
              ? "Abiertas"
              : "En curso"}
          </b>
          <span className="text-xs">inscripciones</span>
        </div>
      </article>
      <button
        className="campaign-primary w-full"
        onClick={() => go("Participantes")}
      >
        Ver participantes
      </button>
      <button
        className="campaign-secondary w-full"
        onClick={() => go("Agregar")}
      >
        Agregar participante
      </button>
      <ShareRegistration campaignId={id} campaignName={o.campaign.name} />
      {missing > 0 && (
        <button
          className="flex w-full justify-between px-2 font-semibold text-amber-800"
          onClick={() => go("Cobertura")}
        >
          Ver horarios que necesitan apoyo <ChevronRight />
        </button>
      )}
    </section>
  );
}
function ShareRegistration({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [canShare, setCanShare] = useState(false),
    [notice, setNotice] = useState(""),
    [manual, setManual] = useState("");
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const url = () => joinShareUrl(window.location.origin, campaignId);
  const share = async () => {
    const registrationUrl = url();
    if (canShare) {
      try {
        await navigator.share({
          title: campaignName,
          text: "Inscríbete en esta campaña y registra tu disponibilidad.",
          url: registrationUrl,
        });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setNotice("✓ Enlace copiado");
    } catch {
      setManual(registrationUrl);
    }
  };
  return (
    <section className="space-y-2">
      <button
        className="campaign-secondary w-full gap-2"
        onClick={() => void share()}
      >
        <Share2 className="h-5 w-5" />
        {canShare ? "Compartir inscripción" : "Copiar enlace"}
      </button>
      {notice && (
        <p role="status" className="text-sm font-semibold text-teal-800">
          {notice}
        </p>
      )}
      {manual && (
        <label className="block text-sm">
          Copia este enlace
          <input className={`${field} mt-1`} readOnly value={manual} />
        </label>
      )}
    </section>
  );
}

type PlanData = PlannerDayView & { congregations: { id: string; name: string }[] };

function OrganizationPlanner({ id }: { id: string }) {
  const [data, setData] = useState<PlanData | null>(null), [dayId, setDayId] = useState(""), [blockId, setBlockId] = useState(""), [pointId, setPointId] = useState(""), [targetSlot, setTargetSlot] = useState<number | null>(null), [search, setSearch] = useState(""), [showManual, setShowManual] = useState(false), [manual, setManual] = useState({ fullName: "", congregationId: "", phone: "", pin: "" }), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(""), [publishIssues, setPublishIssues] = useState<{ revision: string; items: { message: string }[] } | null>(null), [preview, setPreview] = useState(false);
  const [pendingManual, setPendingManual] = useState<{ registrationId: string; blockId: string } | null>(null);
  const load = async (requestedDay = dayId) => {
    const response = await campaignFetch(`/api/campanas/organization/campaigns/${id}/planner${requestedDay ? `?dayId=${encodeURIComponent(requestedDay)}` : ""}`);
    const body = await response.json(); if (!response.ok) throw Error(body.error ?? "No se pudo cargar el planificador.");
    setData(body); setDayId(body.day?.id ?? "");
    const current = organizationPlannerBlock(body.blocks, blockId) ?? body.blocks[0];
    setBlockId(current?.block?.id ?? ""); setPointId((current?.points.find((point: PlannerView["points"][number]) => point.id === pointId && point.active && point.globalActive) ?? current?.points.find((point: PlannerView["points"][number]) => point.active && point.globalActive) ?? current?.points[0])?.id ?? "");
  };
  useEffect(() => { void load("").catch((e: Error) => setError(e.message)); }, [id]);
  const block = data ? organizationPlannerBlock(data.blocks, blockId) : null;
  const point = block?.points.find((item) => item.id === pointId) ?? null;
  const candidates = organizationPlannerCandidates(block, search);
  const api = async (url: string, method: string, body?: unknown) => {
    const response = await campaignFetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { const issue = Error(payload.error ?? "No se pudo guardar el cambio.") as Error & { payload?: any }; issue.payload = payload; throw issue; }
    return payload;
  };
  const assign = async (registrationId: string, targetPointId: string, slot: number): Promise<boolean> => {
    const overrides: { registrationId: string; availability: boolean; maxTurns: boolean; capacity: boolean }[] = [];
    setBusy(true); setError(""); setMessage("");
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await api(`/api/campanas/organization/campaigns/${id}/planner`, "POST", { timeBlockId: blockId, pointId: targetPointId, registrationId, slotNumber: slot, overrides });
          setMessage("Asignación guardada en borrador."); setTargetSlot(null); setSearch(""); setShowManual(false);
          try { await load(dayId); } catch { setError("La asignación se guardó, pero no pudimos actualizar la pantalla. Vuelve a abrir el planificador."); }
          return true;
        } catch (e) {
          const err = e as Error & { payload?: { warnings?: PlannerWarningDTO[] } };
          const warnings = err.payload?.warnings ?? [];
          if (!warnings.length || !window.confirm(`${warnings.map((warning) => `${warning.fullName}: ${warning.message}`).join("\n")}\n\n¿Confirmas esta excepción?`)) { setError(err.message); return false; }
          for (const warning of warnings) {
            let entry = overrides.find((item) => item.registrationId === warning.registrationId);
            if (!entry) { entry = { registrationId: warning.registrationId, availability: false, maxTurns: false, capacity: false }; overrides.push(entry); }
            entry[warning.kind] = true;
          }
        }
      }
      setError("No se pudo completar la asignación. Actualiza y vuelve a intentarlo."); return false;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  };
  const remove = async (assignment: PlannerAssignment) => {
    const assignments = block?.points.find((item) => item.id === assignment.pointId)?.slots ?? [];
    const minor = assignments.find((item) => item?.person.isMinor);
    const groupIds = minor ? [minor.registrationId, minor.person.guardianRegistrationId, assignments[2]?.registrationId] : [];
    const group = minor && groupIds.includes(assignment.registrationId)
      ? assignments.filter((item) => item && groupIds.includes(item.registrationId)).map((item) => item!.person.fullName).join(", ")
      : null;
    const description = group ? `al grupo ${group}` : assignment.person.accepted ? `a ${assignment.person.fullName} y a ${assignment.person.accepted.otherName}, con quien tiene un acuerdo` : `a ${assignment.person.fullName}`;
    if (!window.confirm(`¿Liberar ${description} de este horario? El cambio quedará en borrador.`)) return;
    setBusy(true); try { await api(`/api/campanas/organization/campaigns/${id}/planner/${assignment.id}`, "PATCH", { action: "cancel", expectedVersion: assignment.version }); setMessage("Asignación liberada en borrador."); await load(dayId); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const addManual = async (event: React.FormEvent) => {
    event.preventDefault(); if (!block || !point) return;
    if (!targetSlot || point.slots[targetSlot - 1]) { setError("Este lugar ya no está disponible. Actualiza y selecciona otro."); return; }
    setBusy(true); setError("");
    try {
      const result = pendingManual ?? await api(`/api/campanas/organization/campaigns/${id}/planner/manual-participant`, "POST", { ...manual, phone: manual.phone || undefined, pin: manual.pin || undefined, timeBlockId: block.block!.id });
      setPendingManual({ registrationId: result.registrationId, blockId: pendingManual?.blockId ?? block.block!.id });
      setManual((current) => ({ ...current, pin: "" }));
      if (await assign(result.registrationId, point.id, targetSlot)) { setPendingManual(null); setManual({ fullName: "", congregationId: "", phone: "", pin: "" }); setShowManual(false); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const publish = async (acknowledge = false) => {
    if (!acknowledge && !window.confirm("¿Publicar el borrador actual para que los participantes vean el programa?")) return;
    setBusy(true); setError("");
    try {
      const draft = await api(`/api/campanas/organization/campaigns/${id}/program/draft`, "GET");
      const input = { expectedPlannerRevision: publishIssues?.revision ?? draft.plannerRevision, confirmWarnings: acknowledge, confirmBlockingErrors: acknowledge };
      await api(`/api/campanas/organization/campaigns/${id}/program/draft`, "POST", input);
      setPublishIssues(null); setMessage("Programa publicado. Los participantes verán esta versión."); await load(dayId);
    } catch (e) {
      const err = e as Error & { payload?: any }; const payload = err.payload;
      if (payload?.plannerRevision) setPublishIssues({ revision: payload.plannerRevision, items: [...(payload.blockingErrors ?? []), ...(payload.warnings ?? [])] });
      else setError(err.message);
    } finally { setBusy(false); }
  };
  if (error && !data) return <section className="campaign-surface p-5" role="alert">{error}</section>;
  if (!data) return <section className="campaign-surface p-5">Cargando planificador…</section>;
  const days = data.days;
  const blocksForDay = data.blocks;
  return <section className="space-y-4">
    <header className="campaign-surface space-y-3 p-4"><div><h2 className="text-xl font-bold">Planificador</h2><p className="text-sm text-slate-600">Organiza los lugares de cada turno. Los cambios se guardan en borrador.</p></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Día<select className={`${field} mt-1`} value={dayId} onChange={async (e) => { setDayId(e.target.value); setBlockId(""); try { await load(e.target.value); } catch (x) { setError((x as Error).message); } }}><option value="">Selecciona un día</option>{days.map((day) => <option key={day.id} value={day.id}>{date(day.date)}</option>)}</select></label>
      <label className="text-sm font-semibold">Horario<select className={`${field} mt-1`} value={blockId} onChange={(e) => { setBlockId(e.target.value); const selected = organizationPlannerBlock(blocksForDay, e.target.value); setPointId((selected?.points.find((p) => p.active && p.globalActive) ?? selected?.points[0])?.id ?? ""); }}><option value="">Selecciona un horario</option>{blocksForDay.filter((item) => item.block).map((item) => <option key={item.block!.id} value={item.block!.id}>{organizationPlannerBlockLabel(item)}</option>)}</select></label></div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-xl bg-slate-50 p-2"><b className="block">{block?.metrics.assigned ?? 0}</b>asignados</div><div className="rounded-xl bg-teal-50 p-2"><b className="block">{block?.metrics.available ?? 0}</b>disponibles</div><div className="rounded-xl bg-amber-50 p-2"><b className="block">{block?.points.filter((p) => p.active && p.globalActive).length ?? 0}</b>puntos</div></div>
    </header>
    <div className="flex flex-wrap gap-2"><button className="campaign-secondary flex-1" onClick={() => setPreview((v) => !v)}> {preview ? "Ocultar" : "Ver programa PDF en vivo"}</button><button className="campaign-primary flex-1" disabled={busy} onClick={() => void publish(false)}>Publicar programa</button></div>
    {preview && <section className="campaign-surface overflow-hidden p-3"><p className="mb-2 rounded-lg bg-amber-50 p-2 text-sm font-semibold text-amber-900">Vista previa del programa actual, incluidos los cambios en borrador.</p><a className="mb-3 inline-flex font-semibold text-teal-800 underline" href={`/api/campanas/organization/campaigns/${id}/program/draft/pdf`} target="_blank" rel="noopener noreferrer">Abrir PDF en pantalla completa</a><iframe key={data.updatedAt} title="Vista previa PDF del borrador" className="h-[65vh] w-full rounded-xl border" src={`/api/campanas/organization/campaigns/${id}/program/draft/pdf`} /> </section>}
    {publishIssues && <section className="campaign-surface space-y-3 border-amber-300 p-4"><h3 className="font-bold">Revisión antes de publicar</h3><p className="text-sm">El programa tiene observaciones. Puedes volver a editar o confirmar la publicación con estas observaciones.</p><ul className="max-h-44 list-disc space-y-1 overflow-auto pl-5 text-sm">{publishIssues.items.slice(0, 20).map((item, i) => <li key={i}>{item.message}</li>)}</ul><div className="flex gap-2"><button className="campaign-secondary flex-1" onClick={() => setPublishIssues(null)}>Seguir editando</button><button className="campaign-primary flex-1" disabled={busy} onClick={() => void publish(true)}>Publicar de todos modos</button></div></section>}
    {message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900">{message}</p>}{error && targetSlot === null && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {!block ? <p className="campaign-surface p-4">Selecciona un día y horario para comenzar.</p> : <>
      <section className="space-y-3">{block.points.map((item) => <article key={item.id} className="campaign-surface space-y-3 p-4"><header className="flex items-center justify-between"><div><h3 className="font-bold">{item.name}</h3><p className="text-xs text-slate-500">{item.active && item.globalActive ? "Disponible para asignaciones" : "Punto inactivo"}</p></div></header>
        <div className="grid grid-cols-2 gap-2">{item.slots.map((slot, index) => <div key={index} className={`min-h-20 rounded-xl border p-3 ${slot ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-500">Lugar {index + 1}</p>{slot ? <div className="flex items-center justify-between gap-1"><span className="text-sm font-semibold">{slot.person.fullName}</span><button className="text-sm font-semibold text-rose-700" disabled={busy} onClick={() => void remove(slot)}>Liberar</button></div> : <button className="mt-2 text-sm font-bold text-teal-800" disabled={!item.active || !item.globalActive || busy} onClick={() => { setPointId(item.id); setTargetSlot(index + 1); setSearch(""); setShowManual(false); setError(""); }}>+ Agregar</button>}</div>)}</div>
      </article>)}</section>
      <Dialog open={targetSlot !== null} onOpenChange={(open) => {
        if (!open && !busy) {
          setTargetSlot(null); setSearch(""); setShowManual(false); setError("");
          if (pendingManual) { setPendingManual(null); void load(dayId).catch(() => setError("No se pudo actualizar el planificador.")); }
          setManual({ fullName: "", congregationId: "", phone: "", pin: "" });
        }
      }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-lg">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="text-xl font-bold text-slate-950">Agregar a {point?.name ?? "este punto"}</DialogTitle>
            <DialogDescription>{block.block ? `${date(block.block.date)} · ${block.block.startTime} – ${block.block.endTime}` : ""} · Lugar {targetSlot}</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {!showManual && !pendingManual ? <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-800">Buscar por nombre
              <span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-3.5 h-5 w-5 text-teal-700" /><input autoFocus className={`${field} pl-10`} placeholder="Escribe el nombre del hermano" value={search} onChange={(e) => setSearch(e.target.value)} /></span>
            </label>
            {search.trim().length < 2 ? <p className="text-sm text-slate-500">Escribe al menos dos letras para buscar.</p> : candidates.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No encontramos a nadie con ese nombre. Puedes ingresarlo manualmente.</p> : <div className="max-h-64 space-y-2 overflow-y-auto" aria-label="Resultados de búsqueda">{candidates.slice(0, 20).map((person) => <button type="button" key={person.registrationId} disabled={busy} className="flex w-full items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-left hover:bg-teal-100 disabled:opacity-50" onClick={() => {
              if (!point || !targetSlot) return;
              if (person.accepted && !window.confirm(`${person.fullName} tiene un acuerdo con ${person.accepted.otherName}. Se asignarán juntos. ¿Continuar?`)) return;
              void assign(person.registrationId, point.id, targetSlot);
            }}><span className="min-w-0"><span className="block font-semibold text-slate-900">{person.fullName}</span><span className="block text-xs text-slate-600">{person.congregation}{person.available ? "" : " · disponibilidad distinta"}{person.accepted ? ` · junto a ${person.accepted.otherName}` : ""}</span></span><span className="shrink-0 text-sm font-semibold text-teal-800">Agregar</span></button>)}{candidates.length > 20 && <p className="text-xs text-slate-500">Escribe más letras para precisar la búsqueda.</p>}</div>}
            <button type="button" className="campaign-secondary w-full" onClick={() => { setManual((current) => ({ ...current, fullName: search.trim() })); setShowManual(true); setError(""); }}>+ Ingresar hermano manualmente</button>
          </div> : <form className="space-y-3" onSubmit={(e) => void addManual(e)}>
            {pendingManual ? <p className="rounded-xl bg-teal-50 p-3 text-sm">La persona ya fue registrada. Puedes volver a intentar su asignación sin crear otra cuenta.</p> : <>
              <label className="block text-sm font-semibold">Nombre y apellido<input className={`${field} mt-1`} required minLength={2} value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} /></label>
              <label className="block text-sm font-semibold">Congregación<select className={`${field} mt-1`} required value={manual.congregationId} onChange={(e) => setManual({ ...manual, congregationId: e.target.value })}><option value="">Selecciona congregación</option>{data.congregations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="block text-sm font-semibold">Teléfono (opcional)<input className={`${field} mt-1`} inputMode="tel" placeholder="+56 9…" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} /></label>
              <label className="block text-sm font-semibold">PIN de acceso (opcional; requiere teléfono)<input className={`${field} mt-1`} inputMode="numeric" maxLength={6} value={manual.pin} onChange={(e) => setManual({ ...manual, pin: e.target.value.replace(/\D/g, "") })} /></label>
              <p className="text-xs text-slate-600">Para iniciar sesión necesita teléfono y PIN. Sin PIN queda registrado sin acceso.</p>
            </>}
            <button className="campaign-primary w-full" disabled={busy}>{busy ? "Guardando…" : `Agregar a ${point?.name ?? "este punto"}`}</button>
            {!pendingManual && <button type="button" className="campaign-secondary w-full" disabled={busy} onClick={() => { setShowManual(false); setError(""); }}>Volver a buscar</button>}
          </form>}
        </DialogContent>
      </Dialog>
    </>}
  </section>;
}

function People({
  id,
  initial,
  clear,
}: {
  id: string;
  initial: string | null;
  clear: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [days, setDays] = useState<Day[]>([]),
    [congs, setCongs] = useState<Cong[]>([]),
    [total, setTotal] = useState(0),
    [f, setF] = useState({ q: "", congregationId: "", dayId: "", blockId: "" }),
    [detail, setDetail] = useState<Detail | null>(null),
    [mode, setMode] = useState<"list" | "availability">("list"),
    [error, setError] = useState("");
  const query = useMemo(
    () =>
      new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString(),
    [f],
  );
  const load = () =>
    campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants${query ? `?${query}` : ""}`,
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setRows(b.rows);
        setDays(b.days);
        setCongs(b.congregations);
        setTotal(b.total);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    const t = setTimeout(() => void load(), f.q ? 220 : 0);
    return () => clearTimeout(t);
  }, [query]);
  const open = (r: string) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${r}`,
    )
      .then(async (x) => {
        const b = await x.json();
        if (!x.ok) throw Error(b.error);
        setDetail(b);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    if (initial) {
      open(initial);
      clear();
    }
  }, [initial]);
  if (detail && mode === "availability")
    return (
      <Availability
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail)
    return (
      <section className="space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="font-semibold text-teal-800"
        >
          <ChevronLeft className="inline" />
          Participantes
        </button>
        <article className="campaign-surface space-y-3 p-5">
          <h2 className="text-2xl font-bold">{detail.fullName}</h2>
          <p>{detail.congregation}</p>
          <p>{detail.phone}</p>
          <div><h3 className="mb-2 font-bold">Disponibilidad</h3><AvailabilitySummary days={detail.days.map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, selected: block.available === true })) }))} /></div>
        </article>
        <button
          className="campaign-primary w-full"
          onClick={() => setMode("availability")}
        >
          Editar disponibilidad
        </button>
      </section>
    );
  const blocks = days
    .filter((d) => !f.dayId || d.id === f.dayId)
    .flatMap((d) => d.blocks.map((b) => ({ ...b, d })));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Participantes</h2>
        <p className="text-sm text-slate-600">{total} inscritos</p>
      </div>
      <input
        className={field}
        placeholder="Buscar participante"
        value={f.q}
        onChange={(e) => setF({ ...f, q: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={field}
          value={f.congregationId}
          onChange={(e) => setF({ ...f, congregationId: e.target.value })}
        >
          <option value="">Congregación</option>
          {congs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count || 0})
            </option>
          ))}
        </select>
        <select
          className={field}
          value={f.dayId}
          onChange={(e) => setF({ ...f, dayId: e.target.value, blockId: "" })}
        >
          <option value="">Día</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {date(d.date)} ({d.count || 0})
            </option>
          ))}
        </select>
      </div>
      <select
        className={field}
        value={f.blockId}
        onChange={(e) => setF({ ...f, blockId: e.target.value })}
      >
        <option value="">Horario</option>
        {blocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.startTime}–{b.endTime} ({b.count || 0} disp.)
          </option>
        ))}
      </select>
      {!query ? (
        <div className="campaign-surface p-5 text-center">
          <b>Busca un participante</b>
          <p className="mt-1 text-sm text-slate-600">
            Escribe su nombre o teléfono, o utiliza los filtros para
            encontrarlo.
          </p>
        </div>
      ) : (
        rows.map((r) => (
          <button
            key={r.registrationId}
            className="campaign-surface flex w-full justify-between p-4 text-left"
            onClick={() => open(r.registrationId)}
          >
            <span>
              <b className="block">{r.fullName}</b>
              <span className="text-sm">{r.congregation}</span>
            </span>
            <ChevronRight />
          </button>
        ))
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function PeopleV2({
  id,
  initial,
  clear,
}: {
  id: string;
  initial: string | null;
  clear: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [days, setDays] = useState<Day[]>([]),
    [congs, setCongs] = useState<Cong[]>([]),
    [total, setTotal] = useState(0),
    [resultTotal, setResultTotal] = useState(0),
    [hasMore, setHasMore] = useState(false);
  const [f, setF] = useState({
    q: "",
    congregationId: "",
    dayId: "",
    blockId: "",
    showAllCongregations: false,
    page: 1,
  });
  const [detail, setDetail] = useState<Detail | null>(null),
    [mode, setMode] = useState<"list" | "availability">("list"),
    [error, setError] = useState("");
  const searchKey = useMemo(
    () =>
      JSON.stringify({
        q: f.q,
        congregationId: f.congregationId,
        dayId: f.dayId,
        blockId: f.blockId,
        showAllCongregations: f.showAllCongregations,
      }),
    [f.q, f.congregationId, f.dayId, f.blockId, f.showAllCongregations],
  );
  const query = useMemo(
    () =>
      new URLSearchParams(
        Object.entries(f)
          .map(([k, v]) => [k, k === "q" && String(v).trim().length < 3 ? "" : v])
          .filter(([, v]) => v !== "" && v !== false && v !== 1)
          .map(([k, v]) => [String(k), String(v)]),
      ).toString(),
    [f],
  );
  const load = (signal?: AbortSignal) =>
    campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants${query ? `?${query}` : ""}`,
      { signal },
    )
      .then(async (r) => {
        const b = await r.json();
        if (signal?.aborted) return;
        if (!r.ok) throw Error(b.error);
        setRows((previous) => (b.page > 1 ? [...previous, ...b.rows] : b.rows));
        setDays(b.days);
        setCongs(b.congregations);
        setTotal(b.total);
        setResultTotal(b.resultTotal);
        setHasMore(b.hasMore);
        setError("");
      })
      .catch((e: Error) => { if (!signal?.aborted) setError(e.message); });
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => void load(controller.signal), f.q ? 300 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);
  useEffect(
    () =>
      setF((current) =>
        current.page === 1 ? current : { ...current, page: 1 },
      ),
    [searchKey],
  );
  const open = (registrationId: string) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${registrationId}`,
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        setDetail(body);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    if (initial) {
      open(initial);
      clear();
    }
  }, [initial]);
  if (detail && mode === "availability")
    return (
      <Availability
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail)
    return (
      <section className="space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="font-semibold text-teal-800"
        >
          <ChevronLeft className="inline" />
          Participantes
        </button>
        <article className="campaign-surface space-y-3 p-5">
          <h2 className="text-2xl font-bold">{detail.fullName}</h2>
          <p>{detail.congregation}</p>
          <p>{detail.phone}</p>
          <div><h3 className="mb-2 font-bold">Disponibilidad</h3><AvailabilitySummary days={detail.days.map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, selected: block.available === true })) }))} /></div>
        </article>
        <button
          className="campaign-primary w-full"
          onClick={() => setMode("availability")}
        >
          Editar disponibilidad
        </button>
      </section>
    );
  const blocks = days
    .filter((d) => !f.dayId || d.id === f.dayId)
    .flatMap((d) => d.blocks);
  const hasExplicitSearch = Boolean(
    f.q.trim().length >= 3 || f.congregationId || f.dayId || f.blockId || f.showAllCongregations,
  );
  const update = (values: Partial<typeof f>) =>
    setF((current) => ({ ...current, ...values, page: 1 }));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Participantes</h2>
        <p className="text-sm text-slate-600">
          {total} inscritos
          {hasExplicitSearch ? ` · ${resultTotal} encontrados` : ""}
        </p>
      </div>
      <input
        className={field}
        placeholder="Buscar participante"
        value={f.q}
        onChange={(e) => update({ q: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={field}
          value={f.showAllCongregations ? "all" : f.congregationId}
          onChange={(e) =>
            update(
              e.target.value === "all"
                ? { congregationId: "", showAllCongregations: true }
                : {
                    congregationId: e.target.value,
                    showAllCongregations: false,
                  },
            )
          }
        >
          <option value="">Congregación</option>
          <option value="all">Todas las congregaciones ({total})</option>
          {congs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count || 0})
            </option>
          ))}
        </select>
        <select
          className={field}
          value={f.dayId}
          onChange={(e) => update({ dayId: e.target.value, blockId: "" })}
        >
          <option value="">Todos los días</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {date(d.date)} ({d.count || 0})
            </option>
          ))}
        </select>
      </div>
      <select
        className={field}
        value={f.blockId}
        onChange={(e) => update({ blockId: e.target.value })}
      >
        <option value="">Todos los horarios</option>
        {blocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.startTime}–{b.endTime} ({b.count || 0} disp.)
          </option>
        ))}
      </select>
      {!hasExplicitSearch ? (
        <div className="campaign-surface p-5 text-center">
          <b>Busca un participante</b>
          <p className="mt-1 text-sm text-slate-600">
            Escribe su nombre o teléfono, o utiliza los filtros para
            encontrarlo.
          </p>
        </div>
      ) : (
        <>
          {rows.map((r) => (
            <button
              key={r.registrationId}
              className="campaign-surface flex w-full justify-between p-4 text-left"
              onClick={() => open(r.registrationId)}
            >
              <span>
                <b className="block">{r.fullName}</b>
                <span className="text-sm">{r.congregation}</span>
              </span>
              <ChevronRight />
            </button>
          ))}
          {hasMore && (
            <button
              className="campaign-secondary w-full"
              onClick={() =>
                setF((current) => ({ ...current, page: current.page + 1 }))
              }
            >
              Mostrar más
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function Availability({
  id,
  d,
  back,
  saved,
}: {
  id: string;
  d: Detail;
  back: () => void;
  saved: () => void;
}) {
  const initial = new Set(
    d.days.flatMap((x) => x.blocks.filter((b) => b.available).map((b) => b.id)),
  );
  const [selected, setSelected] = useState<Set<string>>(initial),
    [message, setMessage] = useState("");
  const save = () =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${d.registrationId}/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBlockIds: [...selected],
        }),
      },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setMessage("✓ Disponibilidad actualizada");
        setTimeout(saved, 500);
      })
      .catch((e: Error) => setMessage(e.message));
  return (
    <section className="space-y-4">
      <button onClick={back} className="font-semibold text-teal-800">
        <ChevronLeft className="inline" />
        Ficha
      </button>
      <h2 className="text-xl font-bold">Editar disponibilidad</h2>
      {d.days.map((day) => (
        <article key={day.id} className="campaign-surface p-4">
          <b>{date(day.date)}</b>
          {day.blocks.map((b) => (
            <label key={b.id} className="mt-3 flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                disabled={b.published && selected.has(b.id)}
                onChange={() =>
                  setSelected((s) => {
                    if (b.published && s.has(b.id)) {
                      setMessage(
                        "Este hermano ya tiene un turno publicado en este horario.",
                      );
                      return s;
                    }
                    const n = new Set(s);
                    n.has(b.id) ? n.delete(b.id) : n.add(b.id);
                    return n;
                  })
                }
              />
              {b.startTime}–{b.endTime}
              {b.published ? " · Turno publicado" : ""}
            </label>
          ))}
        </article>
      ))}
      {message && <p role="status">{message}</p>}
      <button className="campaign-primary w-full" onClick={save}>
        Guardar cambios
      </button>
    </section>
  );
}
function Add({
  id,
  o,
  done,
}: {
  id: string;
  o: Overview;
  done: (x: string) => void;
}) {
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [pin, setPin] = useState(""),
    [cong, setCong] = useState(""),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [step, setStep] = useState<1 | 2 | 3>(1),
    [lookup, setLookup] = useState<any>(null),
    [congs, setCongs] = useState<Cong[]>([]),
    [msg, setMsg] = useState(""),
    [created, setCreated] = useState<string | null>(null);
  useEffect(() => {
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants`,
    ).then(async (r) => {
      const b = await r.json();
      if (r.ok) setCongs(b.congregations);
    });
  }, [id]);
  useEffect(() => {
    if (!/^\d{8}$/.test(phone)) {
      setLookup(null);
      return;
    }
    const p = normalizeChileanPhone(phone);
    const t = setTimeout(
      () =>
        void campaignFetch(
          `/api/campanas/organization/campaigns/${id}/participants/lookup?phone=${encodeURIComponent(p)}`,
        )
          .then(async (r) => {
            const b = await r.json();
            if (!r.ok) throw Error(b.error);
            setLookup(b);
            if (b.kind !== "new") {
              setName(b.fullName);
              setPin("");
              setCong(b.congregationId ?? "");
            }
          })
          .catch((e: Error) => setMsg(e.message)),
      350,
    );
    return () => clearTimeout(t);
  }, [phone, id]);
  const next = () => {
    if (!/^\d{8}$/.test(phone))
      return setMsg("Ingresa los 8 dígitos del teléfono.");
    if (!lookup) return setMsg("Comprueba el teléfono antes de continuar.");
    if (!cong) return setMsg("Selecciona la congregación del participante.");
    if (lookup.kind === "new" && !/^\d{4,6}$/.test(pin))
      return setMsg("El PIN debe tener de 4 a 6 números.");
    setStep(step === 1 ? 2 : 3);
  };
  const submit = () =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lookup.kind === "new" ? "create" : "add_existing",
          fullName: name,
          phone: lookup.phone,
          pin: lookup.kind === "new" ? pin : undefined,
          congregationId: cong,
          selectedBlockIds: [...selected],
        }),
      },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (b.kind === "already_registered") {
          setMsg("Este hermano ya participa en esta campaña.");
          return;
        }
        setCreated(b.registrationId);
      })
      .catch((e: Error) => setMsg(e.message));
  if (created)
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Participante agregado</h2>
        <p className="campaign-surface p-5">
          ✓ Participante agregado correctamente
        </p>
        <button
          className="campaign-primary w-full"
          onClick={() => done(created)}
        >
          Ver participante
        </button>
      </section>
    );
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Agregar participante</h2>
      <p className="text-sm font-semibold text-teal-800">
        1 Datos → 2 Disponibilidad → 3 Confirmar
      </p>
      {step === 1 && (
        <>
          <input
            className={field}
            placeholder="Nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-3">
            <span className="border-r border-slate-200 pr-3 font-semibold text-slate-700">
              +56 9
            </span>
            <input
              className="min-w-0 flex-1 border-0 px-3 text-base outline-none"
              aria-label="Últimos 8 dígitos del teléfono"
              placeholder="8765 4321"
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]{8}"
              value={phone}
              onChange={(e) => {
                setPhone(organizerPhoneDigits(e.target.value));
                setLookup(null);
                setMsg("");
              }}
            />
          </div>
          {lookup?.kind === "existing" && (
            <p>Esta persona ya tiene una cuenta. No necesita un PIN nuevo.</p>
          )}
          {lookup?.kind === "already_registered" && (
            <p>Este hermano ya participa en esta campaña.</p>
          )}
          <select
            className={field}
            value={cong}
            onChange={(e) => setCong(e.target.value)}
          >
            <option value="">Selecciona una congregación</option>
            {congs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {lookup?.kind === "new" && (
            <input
              className={field}
              placeholder="PIN inicial"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          )}
          <button className="campaign-primary w-full" onClick={next}>
            Continuar
          </button>
        </>
      )}
      {step === 2 && (
        <>
          {o.days.map((d) => (
            <article key={d.id} className="campaign-surface p-4">
              <b>{date(d.date)}</b>
              {d.blocks.map((b) => (
                <div key={b.id} className="mt-2 rounded-lg border border-slate-200 p-3">
                  <label className="flex min-h-8 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          n.has(b.id) ? n.delete(b.id) : n.add(b.id);
                          return n;
                        })
                      }
                    />
                    <span>{b.startTime}–{b.endTime}</span>
                    {typeof b.minimum === "number" && b.minimum > 0 && (b.count ?? 0) >= b.minimum && (
                      <span className="ml-auto rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cupos cubiertos</span>
                    )}
                  </label>
                  {selected.has(b.id) && typeof b.minimum === "number" && b.minimum > 0 && (b.count ?? 0) >= b.minimum && (
                    <p className="mt-2 pl-7 text-sm text-slate-600">Puedes agregarlo como apoyo adicional; el horario ya está cubierto.</p>
                  )}
                </div>
              ))}
            </article>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <button className="campaign-secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button className="campaign-primary" onClick={next}>
              Continuar
            </button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <article className="campaign-surface p-4">
            <b>{name}</b>
            <p>{congs.find((c) => c.id === cong)?.name}</p>
            <p>{lookup?.phone}</p>
            <p>{selected.size} horarios seleccionados</p>
            {o.days.flatMap((day) => day.blocks).some((block) => selected.has(block.id) && typeof block.minimum === "number" && block.minimum > 0 && (block.count ?? 0) >= block.minimum) && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Incluiste horarios cubiertos. Se agregará como apoyo adicional y quedará registrado en la actividad de organización.</p>
            )}
            <p>Compañero acordado: opcional, después desde la ficha.</p>
          </article>
          <div className="grid grid-cols-2 gap-3">
            <button className="campaign-secondary" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button className="campaign-primary" onClick={submit}>
              {lookup?.kind === "existing"
                ? "Agregar a esta campaña"
                : "Crear participante"}
            </button>
          </div>
        </>
      )}
      {msg && <p role="alert">{msg}</p>}
    </section>
  );
}
function Coverage({ id, open }: { id: string; open: (x: string) => void }) {
  const [coverage, setCoverage] = useState<Day[] | null>(null),
    [detail, setDetail] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void campaignFetch(`/api/campanas/organization/campaigns/${id}/coverage`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        if (active) setCoverage(body.coverage);
      })
      .catch((failure: Error) => active && setError(failure.message));
    return () => {
      active = false;
    };
  }, [id]);
  const blocks = (coverage ?? []).flatMap((d) =>
      d.blocks.map((b) => ({ ...b, d })),
    ),
    missing = blocks.filter((b) => b.state === "missing");
  const see = (b: any) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/coverage/${b.id}`,
    )
      .then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw Error(x.error);
        setDetail({
          ...x,
          title: `${date(b.d.date)} · ${b.startTime}–${b.endTime}`,
        });
      })
      .catch((failure: Error) => setError(failure.message));
  if (error) return <p role="alert">{error}</p>;
  if (!coverage)
    return (
      <section className="campaign-surface p-5">Cargando cobertura…</section>
    );
  if (!blocks.length)
    return (
      <section className="campaign-surface p-5">
        <h2>Aún no hay cobertura para mostrar</h2>
        <p>
          Cuando la campaña tenga días y horarios configurados, aquí podrás
          revisar cuántos hermanos están disponibles en cada bloque.
        </p>
      </section>
    );
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Cobertura</h2>
      <p>
        {blocks.length} horarios · {blocks.length - missing.length} cubiertos ·{" "}
        {missing.length} necesitan apoyo
      </p>
      {coverage.map((d) => (
        <article key={d.id} className="campaign-surface p-4">
          <b>{date(d.date)}</b>
          {d.blocks.map((b) => (
            <button
              key={b.id}
              className="mt-3 flex w-full justify-between text-left"
              onClick={() => see({ ...b, d })}
            >
              <span>
                <b>
                  {b.startTime}–{b.endTime}
                </b>
                <span className="block text-sm">
                  {b.available} disponibles · Necesarios {b.minimum}
                </span>
              </span>
              <span>
                {b.state === "covered" ? "Cubierto" : `Faltan ${b.missing}`}
              </span>
            </button>
          ))}
        </article>
      ))}
      {detail && (
        <section className="campaign-surface p-4">
          <h3>{detail.title}</h3>
          <p>{detail.participants.length} disponibles</p>
          {detail.participants.map((p: any) => (
            <button
              key={p.registrationId}
              onClick={() => open(p.registrationId)}
              className="block w-full py-2 text-left"
            >
              <b>{p.fullName}</b> — {p.congregation}
            </button>
          ))}
          <details>
            <summary>
              {detail.points.length} puntos activos · Ver detalle
            </summary>
            {detail.points.map((p: any) => (
              <p key={p.name}>
                {p.name} — mínimo {p.minimum}
              </p>
            ))}
          </details>
        </section>
      )}
    </section>
  );
}
