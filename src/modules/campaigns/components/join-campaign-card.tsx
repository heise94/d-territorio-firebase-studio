"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { campaignFetch } from "../lib/campaign-fetch";
import type { PublicJoinState } from "../lib/public-join";

export function JoinCampaignCard() {
  const campaignId = useSearchParams().get("campana");
  const [campaign, setCampaign] = useState<PublicJoinState | null>(null);
  const [participant, setParticipant] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const query = campaignId ? `?campana=${encodeURIComponent(campaignId)}` : "";
    void campaignFetch(`/api/campanas/public/join${query}`, { signal: controller.signal })
      .then(async (reply) => { if (!reply.ok) throw new Error("No pudimos cargar la información de la campaña."); const data = await reply.json(); if (!controller.signal.aborted) setCampaign(data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    void campaignFetch("/api/campanas/auth/session", { signal: controller.signal })
      .then((reply) => { if (!controller.signal.aborted) setParticipant(reply.ok); }).catch(() => {});
    return () => controller.abort();
  }, [campaignId]);
  const query = campaignId ? `?campana=${encodeURIComponent(campaignId)}` : "";
  return <section className="campaign-surface space-y-5 border border-[var(--campaign-line)]">
    {campaign?.kind === "single" && <div className="space-y-2">
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--campaign-primary-strong)]">Inscripciones abiertas</p>
      <h2 className="text-xl font-bold">{campaign.campaign.name}</h2>
      {campaign.campaign.locationName && <p className="flex items-start gap-2 text-[var(--campaign-muted)]"><MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />{campaign.campaign.locationName}</p>}
    </div>}
    {campaign?.kind === "none" && <p className="flex items-start gap-2 rounded-2xl bg-[var(--campaign-attention)] p-4 font-medium"><CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />Las inscripciones todavía no están abiertas.</p>}
    {campaign?.kind === "multiple" && <p className="rounded-2xl bg-[var(--campaign-mint)] p-4 font-medium">Hay campañas con inscripciones abiertas. Después de ingresar, podrás verlas y elegir en cuál participar.</p>}
    {!campaign && !error && <p role="status" className="text-sm text-[var(--campaign-muted)]">Cargando información de la campaña…</p>}
    {error && <p role="status" className="text-sm text-[var(--campaign-muted)]">{error} Puedes continuar creando tu cuenta o ingresando.</p>}
    {participant ? <Link href="/campanas" className="campaign-primary w-full gap-2 text-lg">Abrir Campaña exhibidores <ArrowRight aria-hidden="true" className="h-5 w-5" /></Link> : <div className="space-y-3">
      <Link href={`/campanas/registro${query}`} className="campaign-primary w-full gap-2 text-lg">Crear mi cuenta <ArrowRight aria-hidden="true" className="h-5 w-5" /></Link>
      <Link href={`/campanas/ingresar${query}`} className="campaign-secondary w-full text-lg">Ya tengo cuenta</Link>
    </div>}
  </section>;
}
