"use client";
import { useEffect, useState } from "react";
import type { Campaign } from "../domain/types";
import { campaignRepository } from "../repositories/campaign-repository";
import { CampaignEditor } from "./campaign-admin-v2";

export function CampaignEditorPage({
  campaignId,
  section,
}: {
  campaignId: string;
  section: string;
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setCampaign(null);
    setLoading(true);
    setError("");
    return campaignRepository.subscribeCampaign(
      campaignId,
      (row) => {
        setCampaign(row);
        setLoading(false);
        if (!row) setError("La campaña ya no está disponible.");
      },
      () => {
        setLoading(false);
        setError("No pudimos cargar esta campaña. Reintenta en un momento.");
      },
    );
  }, [attempt, campaignId]);
  if (loading)
    return <main className="p-8 text-slate-600">Cargando campaña…</main>;
  if (!campaign)
    return <main className="p-8"><p role="alert" className="text-slate-700">{error || "No pudimos cargar esta campaña."}</p><button type="button" className="mt-4 rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></main>;
  return (
    <CampaignEditor
      campaign={campaign}
      section={section}
      back={() => {
        window.location.href = "/campanas/admin";
      }}
    />
  );
}
