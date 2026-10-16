"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { campaignFetch } from "../lib/campaign-fetch";

type Campaign = { id: string; name: string; roleLabel: string };
export function OrganizationEntry() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]), [error, setError] = useState(""), [ready, setReady] = useState(false);
  useEffect(() => { let active = true; void campaignFetch("/api/campanas/organization/campaigns").then(async (reply) => { const body = await reply.json(); if (!reply.ok) throw new Error(body.error); if (active) setCampaigns(body.campaigns); }).catch((failure: Error) => active && setError(failure.message)).finally(() => active && setReady(true)); return () => { active = false; }; }, []);
  if (!ready) return <main className="campaign-page pt-16"><p role="status">Comprobando acceso a Organización…</p></main>;
  if (error || !campaigns.length) return <main className="campaign-page pt-16"><section className="campaign-surface space-y-3 p-6"><p className="font-semibold">Ingreso organizadores</p><h1 className="text-2xl font-bold">Tu cuenta no tiene acceso a la organización de esta campaña.</h1><p className="text-slate-600">Ingresa con una cuenta que forme parte del equipo de campaña.</p><Link className="campaign-primary w-full" href="/campanas">Volver a mi cuenta</Link></section></main>;
  if (campaigns.length === 1) return <main className="campaign-page pt-16"><section className="campaign-surface space-y-4 p-6"><p className="font-semibold text-teal-700">Modo organización</p><h1 className="text-3xl font-bold">{campaigns[0].name}</h1><p className="text-slate-600">{campaigns[0].roleLabel}</p><Link className="campaign-primary w-full" href={`/campanas/organizacion/${campaigns[0].id}`}>Entrar a Organización</Link><Link className="campaign-secondary w-full" href="/campanas">Volver a mi cuenta</Link></section></main>;
  return <main className="campaign-page pt-16"><section className="space-y-4"><p className="font-semibold text-teal-700">Modo organización</p><h1 className="text-3xl font-bold">Selecciona una campaña</h1>{campaigns.map((campaign) => <Link key={campaign.id} href={`/campanas/organizacion/${campaign.id}`} className="campaign-surface block p-5"><strong>{campaign.name}</strong><span className="mt-1 block text-sm text-slate-600">{campaign.roleLabel}</span></Link>)}<Link className="campaign-secondary w-full" href="/campanas">Volver a mi cuenta</Link></section></main>;
}
