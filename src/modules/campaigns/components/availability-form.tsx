"use client";

import { CalendarDays, Check, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { campaignFetch } from "../lib/campaign-fetch";
import type { MaxTurns, RegistrationView } from "../domain/registration";
import type { PairRequestDTO, PairRequestView } from "../domain/pair-request";
import { saveRegistrationSchema } from "../schemas/registration-schemas";
import { PairRequestSheet } from "./pair-request-sheet";
import { AvailabilitySummary } from "./availability-summary";


function dayName(date: string) {
  const formatted = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)).replace(",", "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function AvailabilityForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [view, setView] = useState<RegistrationView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxTurns, setMaxTurns] = useState<MaxTurns>(1);
  const [pairs, setPairs] = useState<PairRequestDTO[]>([]);
  const [pairBlock, setPairBlock] = useState<{ id: string; label: string } | null>(null);
  const [companionNotice, setCompanionNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}`, { cache: "no-store" });
    if (response.status === 401) { router.replace("/campanas/ingresar"); router.refresh(); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data as RegistrationView;
  }, [campaignId, router]);
  const loadPairs = useCallback(async () => {
    const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}/pair-requests`, { cache: "no-store" });
    if (response.ok) setPairs(((await response.json()) as PairRequestView).requests);
  }, [campaignId]);
  const apply = useCallback((next: RegistrationView) => {
    setView(next);
    setMaxTurns(next.campaign.registration?.maxTurns ?? 1);
    setSelected(new Set(next.days.flatMap((day) => day.blocks.filter((block) => block.selected).map((block) => block.id))));
  }, []);
  useEffect(() => {
    let live = true;
    void Promise.all([load(), loadPairs()]).then(([next]) => { if (live) apply(next); })
      .catch((failure) => { if (live) setError(failure instanceof Error ? failure.message : "No pudimos cargar los horarios."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [apply, load, loadPairs]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!view) return;
    setError(""); setSaved(false);
    const input = { congregationId: view.congregationId ?? "", maxTurns, timeBlockIds: [...selected] };
    if (!saveRegistrationSchema.safeParse(input).success) {
      setError(view.congregationId ? "Revisa los horarios seleccionados." : "Tu congregación no está incluida en esta campaña. Contacta a la organización.");
      return;
    }
    setSaving(true);
    try {
      const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      apply(await load()); await loadPairs(); setSaved(true); setEditing(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos guardar tu disponibilidad.");
    } finally { setSaving(false); }
  }

  if (loading) return <p role="status">Cargando horarios…</p>;
  if (!view) return <p role="alert">{error || "No pudimos cargar los horarios."}</p>;

  const editable = view.campaign.status === "registration_open" &&
    (!view.campaign.registration || view.campaign.registration.registrationStatus === "active");
  const initial = new Set(view.days.flatMap((day) => day.blocks.filter((block) => block.selected).map((block) => block.id)));
  const dirty = maxTurns !== (view.campaign.registration?.maxTurns ?? 1) || selected.size !== initial.size ||
    [...selected].some((id) => !initial.has(id));
  const pairFor = (id: string) => pairs.find((pair) => pair.timeBlock?.id === id && ["pending", "accepted"].includes(pair.status));

  if (view.campaign.registration && !editing) return <section className="space-y-4 pb-20">
    <header><h1 className="text-4xl font-bold tracking-tight">Mi disponibilidad</h1><p className="mt-2 text-[var(--campaign-muted)]">Estos son los horarios que has indicado. Tu asignación definitiva aparecerá en Mi programa.</p></header>
    {saved && <p role="status" className="rounded-xl bg-[var(--campaign-mint)] p-4">✓ Disponibilidad guardada</p>}
    <AvailabilitySummary days={view.days.map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, companions: pairs.filter((pair) => (pair.timeBlock?.id === block.id || (!pair.timeBlock && pair.sharedBlocks.some((shared) => shared.id === block.id))) && ["pending", "accepted"].includes(pair.status)).map((pair) => `${pair.other.fullName} · ${pair.status === "accepted" ? "Confirmado" : pair.direction === "sent" ? "Esperando confirmación" : "Solicitud recibida"}`) })) }))} />
    <p className="campaign-surface p-4"><b>Máximo de turnos:</b> {view.campaign.registration.maxTurns ?? "Sin límite"}</p>
    {editable && <button type="button" className="campaign-primary w-full" onClick={() => setEditing(true)}>Editar disponibilidad</button>}
  </section>;

  return <form onSubmit={save} className="space-y-4 pb-20" aria-busy={saving}>
    <header className="space-y-2">
      <h1 className="text-4xl font-bold tracking-tight">Mi disponibilidad</h1>
      <p className="text-base leading-6 text-[var(--campaign-muted)]">Marca todos los horarios en los que podrías participar. Esto no significa que quedarás asignado en todos.</p>
      {!editable && <p className="campaign-attention">Las inscripciones están cerradas. Puedes revisar tu disponibilidad, pero no modificarla.</p>}
      {editable && !view.congregationId && <p className="campaign-attention">Tu congregación no está incluida en esta campaña. Contacta a la organización.</p>}
    </header>
    <fieldset disabled={!editable || saving} className="space-y-4">
      {view.days.filter((day) => day.blocks.length).map((day) => <section key={day.id} className="space-y-2">
        <div className="flex min-h-[68px] items-center gap-3 rounded-2xl bg-[var(--campaign-mint)] px-4 py-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[var(--campaign-primary-strong)]"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span>
          <h2 className="text-lg font-bold">{dayName(day.date)}</h2>
        </div>
        {day.blocks.map((block) => {
          const checked = selected.has(block.id);
          const closed = block.selectionClosed && !initial.has(block.id);
          const pair = pairFor(block.id);
          const coverageMessage = block.coverageState === "covered"
            ? { label: "Cupos cubiertos", className: "availability-state--covered" }
            : block.coverageState === "last_slots"
              ? { label: "Últimos cupos", className: "availability-state--last-slots" }
              : block.coverageState === "needs_support"
                ? { label: "Falta apoyo", className: "availability-state--needs-support" }
                : null;
          const coverageCardClass = block.coverageState === "needs_support"
            ? "availability-block--needs-support"
            : block.coverageState === "last_slots"
              ? "availability-block--last-slots"
              : "";
          return <article key={block.id} className={`availability-block rounded-2xl border px-3 py-2 shadow-sm ${coverageCardClass} ${checked ? "availability-block--selected border-[var(--campaign-primary)] bg-[#f5fcfa]" : "border-[var(--campaign-line)] bg-white"}`}>
            <label className={`flex min-h-[64px] items-center gap-3 ${closed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <input type="checkbox" className="peer sr-only" checked={checked} disabled={closed} onChange={(event) => {
                const next = new Set(selected);
                event.target.checked ? next.add(block.id) : next.delete(block.id);
                setSelected(next); setSaved(false);
              }} />
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--campaign-primary)] peer-focus-visible:ring-offset-2 ${checked ? "border-[var(--campaign-primary)] bg-[var(--campaign-primary)] text-white" : "border-slate-400"}`}>
                {checked && <Check aria-hidden="true" className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1"><b className="text-lg leading-tight">{block.startTime} – {block.endTime}</b><span className="block text-sm text-[var(--campaign-muted)]">{block.selectionClosed && !initial.has(block.id) ? "Inscripción completa" : "Puedo participar"}</span></span>
              {coverageMessage && <span className={`availability-state ${coverageMessage.className}`}>{coverageMessage.label}</span>}
            </label>
            {block.coverageState === "covered" && <p className="pb-2 text-sm text-[var(--campaign-muted)]">{block.selectionClosed ? "Este horario ya cuenta con apoyo y posibles reemplazos." : "Cupos cubiertos. Si deseas, puedes ofrecerte como apoyo de reemplazo."}</p>}
            {checked && <div className="border-t border-[var(--campaign-line)] pt-1">
              {pair ? <p className="flex min-h-11 items-center gap-2 text-sm"><UsersRound aria-hidden="true" className="h-4 w-4" /><span><b>{pair.other.fullName}</b> · {pair.status === "accepted" ? "Confirmado" : "Esperando confirmación"}</span></p> :
                <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--campaign-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--campaign-primary)]" onClick={() => {
                  if (view.campaign.companionRequestsEnabled) setPairBlock({ id: block.id, label: `${dayName(day.date)} · ${block.startTime}–${block.endTime}` });
                  else setCompanionNotice(true);
                }}><UsersRound aria-hidden="true" className="h-4 w-4" />Indicar compañero{!view.campaign.companionRequestsEnabled && <span className="text-xs font-normal text-[var(--campaign-muted)]">Próximamente</span>}</button>}
            </div>}
          </article>;
        })}
      </section>)}
    </fieldset>
    <section className="campaign-surface p-4"><p className="font-bold">¿Cuántos turnos podrías realizar como máximo?</p><p className="mt-1 text-sm text-[var(--campaign-muted)]">Esto nos ayuda a armar mejor los equipos.</p>
      <div className="mt-3 grid grid-cols-4 gap-2">{([1, 2, 3, null] as MaxTurns[]).map((value) => <button type="button" key={String(value)} className={maxTurns === value ? "campaign-primary min-h-12 px-2 text-sm" : "campaign-secondary min-h-12 px-2 text-sm"} onClick={() => { setMaxTurns(value); setSaved(false); }}>{value ?? "Sin límite"}</button>)}</div>
    </section>
    {saved && <p role="status" className="rounded-xl bg-[var(--campaign-mint)] p-4 font-semibold text-[var(--campaign-primary-strong)]">✓ Disponibilidad guardada</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {view.campaign.registration && <button type="button" className="campaign-secondary w-full" disabled={saving} onClick={() => { apply(view); setEditing(false); setError(""); }}>Volver al resumen</button>}
    {editable && (dirty || saving) && <button className="campaign-primary sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 w-full text-lg shadow-lg" disabled={saving}>{saving ? "Guardando…" : "Guardar disponibilidad"}</button>}
    <Dialog open={companionNotice} onOpenChange={setCompanionNotice}><DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl"><DialogHeader>
      <DialogTitle>Esta opción estará disponible más adelante</DialogTitle>
      <DialogDescription className="pt-2 text-base leading-relaxed">Estamos esperando que la mayoría de los hermanos se inscriba. Durante la última semana habilitaremos la opción para indicar con quién deseas participar y te enviaremos un recordatorio.</DialogDescription>
    </DialogHeader><button type="button" className="campaign-primary w-full" onClick={() => setCompanionNotice(false)}>Entendido</button></DialogContent></Dialog>
    {pairBlock && <PairRequestSheet campaignId={campaignId} timeBlockId={pairBlock.id} label={pairBlock.label} onClose={() => setPairBlock(null)} onSent={() => { setPairBlock(null); void loadPairs(); }} />}
  </form>;
}
