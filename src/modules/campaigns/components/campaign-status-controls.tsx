"use client";
import { campaignStatusLabels } from "../lib/presentation";
import { campaignFetch } from "../lib/campaign-fetch";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { CampaignStatus } from "../domain/types";
const statusDescriptions: Record<CampaignStatus, string> = {
  draft: "Todavía estás preparando la campaña; los hermanos aún no pueden inscribirse.",
  registration_open: "Los hermanos pueden crear su cuenta y registrar su disponibilidad.",
  planning: "Las inscripciones están cerradas y puedes organizar los turnos.",
  published: "El programa oficial está disponible para los participantes.",
  active: "La campaña está en curso.",
  completed: "La campaña terminó y permanece disponible para consulta.",
};
export function CampaignStatusControls({
  campaignId,
  status,
  onChanged,
}: {
  campaignId: string;
  status: CampaignStatus;
  onChanged: (status: CampaignStatus) => void;
}) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const change = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const response = await campaignFetch(
        `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await user.getIdToken(true)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status:
              status === "draft" || status === "planning"
                ? "registration_open"
                : "planning",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onChanged(data.status);
      setConfirmed(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo cambiar el estado.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">Estado de la campaña</h2>
      <div className="rounded-xl bg-teal-50 p-4">
        <p className="font-semibold text-teal-950">{campaignStatusLabels[status]}</p>
        <p className="mt-1 text-sm text-slate-700">{statusDescriptions[status]}</p>
      </div>
      {status === "registration_open" && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            disabled={saving}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>Confirmo que, al cerrar inscripciones, los participantes ya no podrán modificar su disponibilidad.</span>
        </label>
      )}
      {(status === "draft" || status === "registration_open" || status === "planning") && (
        <button
          className="rounded-xl bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
          disabled={
            saving || !user || (status === "registration_open" && !confirmed)
          }
          onClick={change}
        >
          {saving
            ? "Guardando…"
            : status === "draft"
              ? "Abrir inscripciones"
              : status === "planning"
                ? "Abrir inscripciones nuevamente"
                : "Cerrar inscripciones e iniciar planificación"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {(status === "draft" || status === "registration_open" || status === "planning") && (
        <p className="text-sm text-slate-600">La publicación del programa se realiza después, desde «Programa».</p>
      )}
    </section>
  );
}
