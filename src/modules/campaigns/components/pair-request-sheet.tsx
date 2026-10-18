"use client";
import { Search, UsersRound, X } from "lucide-react";
import React, { useEffect, useState, type FormEvent } from "react";
import { campaignFetch } from "../lib/campaign-fetch";
import type { PairCandidate } from "../domain/pair-request";

export function PairRequestSheet({ campaignId, timeBlockId, label, onClose, onSent }: { campaignId: string; timeBlockId: string; label: string; onClose: () => void; onSent: () => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<PairCandidate[]>([]); const [candidate, setCandidate] = useState<PairCandidate | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const base = `/api/campanas/participant/campaigns/${campaignId}`;
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  useEffect(() => {
    setResults([]); setSearched(false); setError("");
    if (query.trim().length < 3 || candidate) { setSearching(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      void campaignFetch(`${base}/pair-candidates?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", signal: controller.signal })
        .then(async (reply) => { const data = await reply.json(); if (!reply.ok) throw new Error(data.error); if (!controller.signal.aborted) { setResults(data.candidates); setSearched(true); } })
        .catch((e) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No pudimos buscar."); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, candidate, base, searchAttempt]);
  function search(event: FormEvent) { event.preventDefault(); event.stopPropagation(); if (query.trim().length < 3) setError("Escribe al menos tres letras del nombre."); else setSearchAttempt((value) => value + 1); }
  async function send() { if (!candidate) return; setBusy(true); setError(""); try { const reply = await campaignFetch(`${base}/pair-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", recipientRegistrationId: candidate.registrationId, timeBlockId }), cache: "no-store" }); const data = await reply.json(); if (!reply.ok) throw new Error(data.error); onSent(); } catch (e) { setError(e instanceof Error ? e.message : "No pudimos enviar la solicitud."); } finally { setBusy(false); } }
  return <div role="dialog" aria-modal="true" aria-label="Indicar compañero" className="fixed inset-0 z-40 flex items-end bg-slate-950/30 p-3 sm:items-center sm:justify-center"><section className="mb-[env(safe-area-inset-bottom)] max-h-[85dvh] overflow-y-auto w-full max-w-md rounded-t-[24px] bg-white p-5 shadow-2xl sm:rounded-[24px]"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="campaign-icon-surface"><UsersRound /></span><div><h2 className="text-2xl font-bold">¿Con quién acordaste participar?</h2><p className="mt-1 text-sm text-[var(--campaign-muted)]">Usa esta opción solo si ya conversaron y acordaron participar juntos en este horario.</p></div></div><button type="button" className="min-h-11 min-w-11" aria-label="Cerrar" onClick={onClose}><X /></button></div><p className="mt-4 rounded-xl bg-[var(--campaign-mint)] p-3 font-semibold">{label}</p>{!candidate ? <><div className="mt-4 flex gap-2"><input className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--campaign-line)] px-3" value={query} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); } }} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre" /><button type="button" onClick={search} className="campaign-primary min-h-12 px-4" disabled={busy} aria-label="Buscar"><Search /></button></div><div aria-live="polite" className="mt-3 space-y-2">{searching && <p role="status">Buscando…</p>}{!searching && searched && !results.length && <p>No encontramos hermanos con ese nombre en esta campaña.</p>}{query.trim().length < 3 && <p className="text-sm text-slate-600">Escribe al menos tres letras para ver opciones.</p>}{results.map((row) => <button type="button" key={row.registrationId} className="campaign-secondary w-full justify-start text-left" onClick={() => setCandidate(row)}><span><b>{row.fullName}</b><br /><small>{row.congregation}</small></span></button>)}</div></> : <div className="mt-4 space-y-4"><div className="campaign-surface border border-[var(--campaign-line)]"><p className="font-bold">{candidate.fullName}</p><p className="text-sm text-[var(--campaign-muted)]">{candidate.congregation}</p></div><p className="text-sm text-[var(--campaign-muted)]">La otra persona recibirá una solicitud para confirmar este horario.</p><div className="grid grid-cols-2 gap-3"><button type="button" className="campaign-secondary" onClick={() => setCandidate(null)} disabled={busy}>Volver</button><button type="button" className="campaign-primary" onClick={() => void send()} disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button></div></div>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</section></div>;
}
