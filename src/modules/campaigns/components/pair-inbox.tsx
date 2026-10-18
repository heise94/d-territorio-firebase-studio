"use client";
import { Check, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { campaignFetch } from "../lib/campaign-fetch";
import type { PairInboxGroup } from "../domain/pair-request";


function humanSchedule(date: string, startTime: string, endTime: string) {
  const day = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
  return `${day.charAt(0).toLocaleUpperCase("es-CL")}${day.slice(1)} · ${startTime} a ${endTime}`;
}

export function PairInbox({ expanded = false, compact = false }: { expanded?: boolean; compact?: boolean }) {
  const [groups, setGroups] = useState<PairInboxGroup[]>([]); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const load = async () => { const reply = await campaignFetch("/api/campanas/participant/pair-inbox", { cache: "no-store" }); const data = await reply.json(); if (!reply.ok) throw new Error(data.error); setGroups(data.groups); };
  useEffect(() => { void load().catch(() => setError("No pudimos actualizar tus solicitudes pendientes.")); }, []);
  async function respond(campaignId: string, id: string, action: "accept" | "reject") { setBusy(id); setError(""); try { const response = await campaignFetch(`/api/campanas/participant/campaigns/${campaignId}/pair-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId: id }), cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await load(); window.dispatchEvent(new Event("campanas-notification")); } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar tu respuesta."); } finally { setBusy(""); } }
  if (error && !groups.length) return <p role="alert">{error}</p>;
  if (!groups.length) return expanded ? <p>No tienes solicitudes pendientes recibidas.</p> : null;
  const entries = groups.flatMap((group) => (group.requests ?? []).map((request) => ({ group, request })));
  return <section aria-label="Solicitudes pendientes recibidas" className={compact ? "space-y-3" : "space-y-4"}>{entries.slice(0, expanded ? undefined : 1).map(({ group, request }) => <article key={request.id} className={`campaign-attention ${compact ? "space-y-3 p-4" : "space-y-4"}`}><div className="flex items-start gap-3"><span className="campaign-icon-surface bg-amber-100 text-amber-700"><UsersRound /></span><div><p className="font-semibold text-amber-700">Necesita tu respuesta</p><h2 className={`mt-1 font-bold ${compact ? "text-xl" : "text-2xl"}`}>{request.sender} quiere trabajar contigo</h2>{request.timeBlock && <p className="mt-2 text-[var(--campaign-muted)]">{humanSchedule(request.timeBlock.date, request.timeBlock.startTime, request.timeBlock.endTime)}</p>}</div></div><div className="grid grid-cols-2 gap-3"><button disabled={!!busy} className="campaign-primary gap-2" onClick={() => void respond(group.campaignId, request.id, "accept")}><Check className="h-5 w-5" />{request.recipientCanAddAvailability ? "Confirmar y agregar horario" : "Confirmar"}</button><button disabled={!!busy} className="campaign-secondary gap-2" onClick={() => void respond(group.campaignId, request.id, "reject")}><X className="h-5 w-5" />No acordamos esto</button></div></article>)}{error && <p role="alert" className="text-red-700">{error}</p>}</section>;
}
