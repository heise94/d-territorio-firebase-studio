"use client";
import { campaignStatusLabels } from "../lib/presentation";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { campaignFetch } from "../lib/campaign-fetch";
import type { AdminOverview } from "../domain/admin-dashboard";
import type { ProgramView } from "../domain/program";

export function CampaignSummary({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<{
    overview: AdminOverview;
    program: ProgramView;
    pendingCount: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!user) return;
        const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}`;
        const headers = {
          Authorization: `Bearer ${await user.getIdToken(true)}`,
        };
        const read = async (path: string) => {
          const response = await campaignFetch(`${base}/${path}`, {
            headers,
            cache: "no-store",
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          return body;
        };
        const [overview, program] = (await Promise.all([
          read("overview"),
          read("program"),
        ])) as [AdminOverview, ProgramView];
        const pendingCount =
          program.mode === "published"
            ? (await read("change-requests")).pendingCount
            : 0;
        if (alive) {
          setView({ overview, program, pendingCount });
          setError("");
        }
      } catch (e) {
        if (alive)
          setError(
            e instanceof Error ? e.message : "No se pudo cargar el resumen.",
          );
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [campaignId, user]);
  if (error)
    return (
      <main className="p-8">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      </main>
    );
  if (!view)
    return <main className="p-8 text-slate-600">Cargando resumen…</main>;
  const { overview, program, pendingCount } = view;
  const days = program.snapshot.days.map((day) => {
    const cells = day.blocks
      .flatMap((block) => block.cells)
      .filter((cell) => cell.active);
    const total = cells.length * 2;
    const assigned = cells.reduce(
      (sum, cell) => sum + cell.slots.filter(Boolean).length,
      0,
    );
    return { ...day, total, assigned, missing: total - assigned };
  });
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const assigned = days.reduce((sum, day) => sum + day.assigned, 0);
  return (
    <main className="mx-auto max-w-7xl space-y-7 p-5 lg:p-9">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">
            Resumen de campaña
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">
            {overview.campaign.name}
          </h1>
          <p className="mt-2 text-slate-600">
            {overview.campaign.dates.join(" · ") || "Fechas por definir"} ·{" "}
            {campaignStatusLabels[overview.campaign.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-xl border bg-white px-4 py-3 font-semibold"
            href={`/campanas/admin/programa/${campaignId}`}
          >
            Ver programa
          </Link>
          <Link
            className="rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white"
            href={`/campanas/admin/planificar/${campaignId}`}
          >
            Ir al planificador
          </Link>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Turnos asignados", `${assigned} de ${total}`],
          ["Turnos por asignar", String(total - assigned)],
          ["Solicitudes pendientes", String(pendingCount)],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-3 text-4xl font-extrabold text-teal-800">
              {value}
            </p>
          </article>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-bold">Turnos por día</h2>
        </div>
        <div className="divide-y">
          {days.map((day) => (
            <div
              key={day.id}
              className="grid gap-3 p-5 md:grid-cols-[1fr_100px_120px_auto] md:items-center"
            >
              <p className="font-semibold">{day.label || day.date}</p>
              <p>
                {day.assigned} / {day.total}
              </p>
              <p
                className={
                  day.missing
                    ? "font-semibold text-amber-700"
                    : "font-semibold text-emerald-700"
                }
              >
                {day.missing ? `Faltan ${day.missing}` : "Completo"}
              </p>
              <Link
                href={`/campanas/admin/planificar/${campaignId}?day=${day.id}`}
                className="font-semibold text-teal-800"
              >
                Ver día →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
