"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { campaignFetch } from "../lib/campaign-fetch";

type ReviewRow = { registrationId: string; fullName: string; available: boolean; maxTurns: number | null; status: "pending" | "approved" | "not_approved" };
const tabs = ["pending", "approved", "not_approved"] as const;
const labels = { pending: "Pendientes", approved: "Aprobados", not_approved: "No autorizados" };

/** Private congregation screen: it never downloads another congregation's rows. */
export function CongregationReview({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<(typeof tabs)[number]>("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/congregation-participants`;
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await campaignFetch(`${base}?status=${status}`, { headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los participantes.");
      setRows(body); setError("");
    } catch (failure) { setRows([]); setError(failure instanceof Error ? failure.message : "No se pudo cargar la congregación."); }
    finally { setLoading(false); }
  }, [base, status, user]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function review(registrationId: string, next: "approved" | "not_approved") {
    if (!user) return;
    const response = await campaignFetch(`${base}/${encodeURIComponent(registrationId)}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
    });
    if (!response.ok) { const body = await response.json(); setError(body.error ?? "No se pudo guardar la revisión."); return; }
    await refresh();
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Contexto privado</p><h1 className="text-3xl font-bold text-slate-950">Mi congregación</h1><p className="mt-2 text-slate-600">Revisa solo los inscritos de tu congregación antes de que estén disponibles para la planificación.</p></header>
    <div className="flex flex-wrap gap-2" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={status === tab} onClick={() => setStatus(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === tab ? "bg-teal-700 text-white" : "border bg-white text-slate-700"}`}>{labels[tab]}</button>)}</div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-bold">{labels[status]}</h2></div>{loading ? <p className="p-5">Cargando…</p> : rows.length === 0 ? <p className="p-5 text-slate-600">No hay participantes en esta lista.</p> : <ul>{rows.map((row) => <li key={row.registrationId} className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0"><div><p className="font-semibold">{row.fullName}</p><p className="text-sm text-slate-600">{row.available ? "Inscripción activa" : "Inscripción inactiva"} · Máximo: {row.maxTurns ?? "sin límite"} turnos</p></div>{status === "pending" && <div className="flex gap-2"><button onClick={() => void review(row.registrationId, "approved")} className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Aprobar para planificación</button><button onClick={() => void review(row.registrationId, "not_approved")} className="rounded border px-3 py-2 text-sm font-semibold">No aprobar</button></div>}</li>)}</ul>}</section>
  </main>;
}
