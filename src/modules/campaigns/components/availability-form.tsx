"use client";
import { CalendarDays, Check, Clock3, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { campaignFetch } from "../lib/campaign-fetch";
import type { MaxTurns, RegistrationView } from "../domain/registration";
import type { PairRequestDTO, PairRequestView } from "../domain/pair-request";
import { saveRegistrationSchema } from "../schemas/registration-schemas";
import { PairRequestSheet } from "./pair-request-sheet";

function dayName(date: string) { return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)); }

export function AvailabilityForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [view, setView] = useState<RegistrationView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [congregationId, setCongregationId] = useState("");
  const [maxTurns, setMaxTurns] = useState<MaxTurns>(1);
  const [pairs, setPairs] = useState<PairRequestDTO[]>([]);
  const [pairBlock, setPairBlock] = useState<{ id: string; label: string } | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}`, { cache: "no-store" });
    if (response.status === 401) { router.replace("/campanas/ingresar"); router.refresh(); }
    const data = await response.json(); if (!response.ok) throw new Error(data.error); return data as RegistrationView;
  }, [campaignId, router]);
  const loadPairs = useCallback(async () => {
    const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}/pair-requests`, { cache: "no-store" });
    if (!response.ok) return; const data = await response.json() as PairRequestView; setPairs(data.requests);
  }, [campaignId]);
  const apply = useCallback((next: RegistrationView) => { setView(next); setCongregationId(next.congregationId ?? ""); setMaxTurns(next.campaign.registration?.maxTurns ?? 1); setSelected(new Set(next.days.flatMap((day) => day.blocks.filter((block) => block.selected).map((block) => block.id)))); }, []);
  useEffect(() => { let live = true; void Promise.all([load(), loadPairs()]).then(([next]) => { if (live) apply(next); }).catch((e) => live && setError(e instanceof Error ? e.message : "No pudimos cargar los horarios.")).finally(() => live && setLoading(false)); return () => { live = false; }; }, [apply, load, loadPairs]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!view) return; setError(""); setSaved(false);
    const input = { congregationId, maxTurns, timeBlockIds: [...selected] };
    if (!saveRegistrationSchema.safeParse(input).success) { setError("Selecciona tu congregación y revisa los horarios."); return; }
    setSaving(true); try {
      const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); apply(await load()); await loadPairs(); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar tu disponibilidad."); } finally { setSaving(false); }
  }
  if (loading) return <p role="status">Cargando horarios…</p>;
  if (!view) return <p role="alert">{error || "No pudimos cargar los horarios."}</p>;
  const editable = view.campaign.status === "registration_open" && (!view.campaign.registration || view.campaign.registration.registrationStatus === "active");
  const pairFor = (id: string) => pairs.find((pair) => pair.timeBlock?.id === id && ["pending", "accepted"].includes(pair.status));
  return <form onSubmit={save} className="space-y-5" aria-busy={saving}>
    <header className="space-y-3"><h1 className="text-4xl font-bold tracking-tight">Mi disponibilidad</h1><p className="text-lg leading-7 text-[var(--campaign-muted)]">Marca todos los horarios en los que podrías participar. Esto no significa que quedarás asignado en todos.</p>{!editable && <p className="campaign-attention">Las inscripciones están cerradas. Puedes revisar tu disponibilidad, pero no modificarla.</p>}</header>
    {!view.campaign.registration && <label className="block font-semibold">Congregación<select required value={congregationId} onChange={(e) => { setCongregationId(e.target.value); setSaved(false); }} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--campaign-line)] bg-white px-3"><option value="">Selecciona tu congregación</option>{view.congregations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
    <fieldset disabled={!editable || saving} className="space-y-5">{view.days.filter((day) => day.blocks.length).map((day) => <section key={day.id} className="space-y-3"><div className="campaign-mint flex items-center gap-3"><span className="campaign-icon-surface"><CalendarDays /></span><h2 className="text-2xl font-bold capitalize">{dayName(day.date)}</h2></div>{day.blocks.map((block) => { const checked = selected.has(block.id); const pair = pairFor(block.id); return <article key={block.id} className={`campaign-surface space-y-3 ${checked ? "ring-2 ring-[var(--campaign-primary)]" : ""}`}><label className="flex cursor-pointer items-center gap-4"><input type="checkbox" className="sr-only" checked={checked} onChange={(event) => { const next = new Set(selected); event.target.checked ? next.add(block.id) : next.delete(block.id); setSelected(next); setSaved(false); }} /><span className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 ${checked ? "border-[var(--campaign-primary)] bg-[var(--campaign-primary)] text-white" : "border-slate-400"}`}>{checked && <Check />}</span><span className="min-w-0 flex-1"><b className="text-2xl">{block.startTime} – {block.endTime}</b><span className="mt-1 block text-[var(--campaign-muted)]">Puedo participar</span></span><Clock3 className="h-7 w-7 text-[var(--campaign-muted)]" /></label>{checked && <div className="rounded-2xl bg-[var(--campaign-mint)] p-4">{pair ? <div className="flex items-center gap-3"><UsersRound /><div><p className="font-bold">{pair.other.fullName} · {pair.status === "accepted" ? "Confirmado" : "Esperando confirmación"}</p><p className="text-sm text-[var(--campaign-muted)]">{pair.other.congregation}</p></div></div> : <><p className="font-bold">¿Ya acordaste participar con alguien?</p><p className="mt-1 text-sm text-[var(--campaign-muted)]">Si ya coordinaste con otra persona, indícalo aquí.</p><button type="button" className="campaign-secondary mt-3 w-full gap-2" onClick={() => setPairBlock({ id: block.id, label: `${dayName(day.date)} · ${block.startTime}–${block.endTime}` })}><UsersRound className="h-5 w-5" />Indicar compañero</button></>}</div>}</article>; })}</section>)}</fieldset>
    <section className="campaign-surface"><p className="font-bold text-lg">¿Cuántos turnos podrías realizar como máximo?</p><p className="mt-1 text-sm text-[var(--campaign-muted)]">Esto nos ayuda a armar mejor los equipos.</p><div className="mt-4 grid grid-cols-4 gap-2">{([1, 2, 3, null] as MaxTurns[]).map((value) => <button type="button" key={String(value)} className={maxTurns === value ? "campaign-primary min-h-12 px-2" : "campaign-secondary min-h-12 px-2"} onClick={() => { setMaxTurns(value); setSaved(false); }}>{value ?? "Sin límite"}</button>)}</div></section>
    {saved && <p role="status" className="rounded-xl bg-[var(--campaign-mint)] p-4 font-semibold text-[var(--campaign-primary-strong)]">✓ Disponibilidad guardada</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{editable && <button className="campaign-primary sticky bottom-24 z-10 w-full text-lg" disabled={saving}>{saving ? "Guardando…" : "Guardar disponibilidad"}</button>}{pairBlock && <PairRequestSheet campaignId={campaignId} timeBlockId={pairBlock.id} label={pairBlock.label} onClose={() => setPairBlock(null)} onSent={() => { setPairBlock(null); void loadPairs(); }} />}
  </form>;
}
