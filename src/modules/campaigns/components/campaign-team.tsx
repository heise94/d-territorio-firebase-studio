"use client";

import { useEffect, useState } from "react";
import { Search, UserRound, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Member = { registrationId: string; name: string; congregation: string };
type TeamView = {
  primary: Member | null;
  helpers: Member[];
  candidates: Member[];
  revision: number;
  canEdit: boolean;
  accessNotice: string;
};
type Action = "setPrimary" | "clearPrimary" | "addHelper" | "removeHelper";

export function CampaignTeam({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<TeamView | null>(null);
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState<"primary" | "helper" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/team?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setView(data);
      } catch (error) {
        if (!controller.signal.aborted)
          setMessage(error instanceof Error ? error.message : "No se pudo consultar el equipo.");
      }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [campaignId, query, user]);

  async function change(action: Action, registrationId?: string) {
    if (!user || !view || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/team`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, registrationId, expectedRevision: view.revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setView(data);
      setSelecting(null);
      setQuery("");
      setMessage("Equipo actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el equipo.");
    } finally {
      setBusy(false);
    }
  }

  const availableCandidates = view?.candidates.filter((candidate) =>
    candidate.registrationId !== view.primary?.registrationId &&
    (selecting === "primary" || !view.helpers.some((helper) => helper.registrationId === candidate.registrationId)),
  ) ?? [];

  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-slate-600">
        Selecciona personas ya inscritas en esta campaña. Esta asignación define el equipo; el acceso al panel se habilitará en una etapa posterior.
      </p>
      {!view && !message && <p role="status" className="text-sm text-slate-600">Cargando equipo…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
          <div className="flex items-center gap-2 font-semibold text-teal-950"><UserRound size={19} />Administrador principal</div>
          {view?.primary ? (
            <p className="mt-3 text-sm"><strong>{view.primary.name}</strong><span className="block text-slate-600">{view.primary.congregation}</span></p>
          ) : <p className="mt-3 text-sm text-slate-600">Aún no se ha asignado.</p>}
          {view?.canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900" onClick={() => { setSelecting("primary"); setQuery(""); }}>
                {view.primary ? "Cambiar administrador" : "Asignar administrador"}
              </button>
              {view.primary && <button type="button" disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white" onClick={() => change("clearPrimary")}>Quitar</button>}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Users size={19} />Ayudantes</div>
          {view?.helpers.length ? (
            <ul className="mt-3 divide-y divide-slate-200">
              {view.helpers.map((member) => <li key={member.registrationId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><strong>{member.name}</strong><span className="block text-slate-600">{member.congregation}</span></span>
                {view.canEdit && <button type="button" disabled={busy} className="font-semibold text-teal-800 hover:underline" onClick={() => change("removeHelper", member.registrationId)}>Quitar</button>}
              </li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-600">No hay ayudantes asignados.</p>}
          {view?.canEdit && <button type="button" className="mt-4 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-white" onClick={() => { setSelecting("helper"); setQuery(""); }}>Agregar ayudante</button>}
        </div>
      </div>
      {selecting && view?.canEdit && (
        <div className="rounded-xl border border-teal-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{selecting === "primary" ? "Elegir administrador principal" : "Elegir ayudante"}</h3>
            <button type="button" className="text-sm text-slate-600 hover:underline" onClick={() => { setSelecting(null); setQuery(""); }}>Cancelar</button>
          </div>
          <label className="mt-3 block text-sm font-medium">Buscar hermano
            <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-teal-500">
              <Search size={18} aria-hidden="true" />
              <input className="h-10 w-full outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, teléfono o congregación" autoComplete="off" />
            </span>
          </label>
          {query.trim().length < 2 ? <p className="mt-3 text-sm text-slate-600">Escribe al menos dos caracteres.</p> : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {availableCandidates.map((candidate) => (
                <li key={candidate.registrationId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span><strong>{candidate.name}</strong><span className="block text-slate-600">{candidate.congregation}</span></span>
                  <button type="button" disabled={busy} className="font-semibold text-teal-800 hover:underline" onClick={() => change(selecting === "primary" ? "setPrimary" : "addHelper", candidate.registrationId)}>
                    {selecting === "primary" ? "Asignar como administrador" : "Agregar como ayudante"}
                  </button>
                </li>
              ))}
              {availableCandidates.length === 0 && <li className="text-sm text-slate-600">No se encontraron participantes disponibles para esta función.</li>}
            </ul>
          )}
        </div>
      )}
      <p role="status" className="text-sm text-slate-600">{message}</p>
      <p className="text-xs font-semibold tracking-wide text-amber-800">ACCESO ADMINISTRATIVO PENDIENTE DE IMPLEMENTAR</p>
    </div>
  );
}
