"use client";
import Link from "next/link";
import { CalendarCheck, ChevronRight, Clock3, MapPin, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { PersonalProgram } from "../domain/program";
import { campaignFetch } from "../lib/campaign-fetch";
function dayText(date: string) { return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)); }
export function ParticipantNextTurn() {
  const [program, setProgram] = useState<PersonalProgram | null>(null);
  useEffect(() => { const controller = new AbortController(); void campaignFetch("/api/campanas/participant/my-program", { signal: controller.signal, cache: "no-store" }).then(async (response) => response.ok ? setProgram(await response.json()) : null).catch(() => {}); return () => controller.abort(); }, []);
  const now = new Date().toISOString().slice(0, 16);
  const turn = program?.campaigns.flatMap((campaign) => campaign.published ? campaign.turns.map((item) => ({ ...item, campaignName: campaign.name })) : []).filter((item) => `${item.date}T${item.endTime}` >= now).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  if (!program) return <section className="campaign-mint"><p>Consultando tu próximo turno…</p></section>;
  if (!turn) return <section className="campaign-surface"><div className="flex gap-3"><span className="campaign-icon-surface"><CalendarCheck /></span><div><h2 className="text-xl font-bold">Aún no tienes próximo turno</h2><p className="text-[var(--campaign-muted)]">Cuando el programa esté publicado, podrás verlo aquí.</p></div></div></section>;
  return <section className="campaign-mint space-y-4"><div className="flex gap-3"><span className="campaign-icon-surface"><CalendarCheck /></span><p className="self-center text-xl font-bold text-[var(--campaign-primary-strong)]">Próximo turno</p></div><div><h2 className="text-3xl font-bold capitalize">{dayText(turn.date)}</h2><p className="mt-2 text-2xl font-bold">{turn.startTime}–{turn.endTime}</p></div><div className="space-y-2 text-lg"><p className="flex gap-3"><MapPin className="text-[var(--campaign-primary)]" />{turn.pointName}</p><p className="flex gap-3"><UsersRound className="text-[var(--campaign-primary)]" />Con {turn.companionName ?? "compañero pendiente"}</p></div><Link href="/campanas/mi-programa" prefetch={false} className="campaign-primary w-full gap-3"><Clock3 />Ver mi programa<ChevronRight className="ml-auto" /></Link></section>;
}
