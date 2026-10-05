"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { CampaignStatus } from "../domain/types";
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
            status: status === "draft" ? "registration_open" : "planning",
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
    <section className="space-y-2">
      <h2 className="text-xl font-bold">Estado</h2>
      <p>
        Actual: <strong>{status}</strong>
      </p>
      {status === "registration_open" && (
        <label className="block">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={saving}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          Confirmo cerrar inscripciones y disponibilidad: los participantes
          quedarán en lectura.
        </label>
      )}
      {(status === "draft" || status === "registration_open") && (
        <button
          className="rounded bg-teal-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={
            saving || !user || (status === "registration_open" && !confirmed)
          }
          onClick={change}
        >
          {saving
            ? "Guardando…"
            : status === "draft"
              ? "Abrir inscripciones"
              : "Cerrar inscripciones e iniciar planificación"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p className="text-sm text-slate-600">
        Publicación, ejecución y cierre no se habilitan en esta fase.
      </p>
    </section>
  );
}
