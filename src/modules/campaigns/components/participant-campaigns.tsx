"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignSummary } from "../domain/registration";

export function ParticipantCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError("");
    campaignFetch("/api/campanas/participant/campaigns", { cache: "no-store" })
      .then(async (reply) => {
        if (reply.status === 401) {
          router.replace("/campanas/ingresar");
          router.refresh();
        }
        const result = await reply.json();
        if (!reply.ok) throw new Error(result.error);
        if (!disposed) setCampaigns(result.campaigns);
      })
      .catch((failure: Error) => {
        if (!disposed) setError(failure.message);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [router, attempt]);
  return (
    <section
      className="space-y-4"
      aria-label="Campañas disponibles"
      aria-busy={loading}
    >
      {loading && <p role="status">Cargando campañas…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => setAttempt(attempt + 1)}
            className="mt-3 min-h-12 rounded-xl border border-slate-300 px-4"
          >
            Intentar nuevamente
          </button>
        </div>
      )}
      {!loading && !error && !campaigns.length && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5">
          Por ahora no hay campañas con inscripciones abiertas.
        </p>
      )}
      {!loading &&
        !error &&
        campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-xl font-bold">{campaign.name}</h2>
            <p className="text-sm font-semibold text-teal-800">
              {campaign.status === "registration_open"
                ? "Inscripciones abiertas"
                : "Inscripciones cerradas · solo consulta"}
            </p>
            {campaign.description && (
              <p className="leading-7">{campaign.description}</p>
            )}
            {campaign.locationName && (
              <p className="text-slate-600">{campaign.locationName}</p>
            )}
            {campaign.registration && (
              <p>
                Tu inscripción:{" "}
                {campaign.registration.registrationStatus === "active"
                  ? "activa"
                  : campaign.registration.registrationStatus === "withdrawn"
                    ? "retirada"
                    : "cancelada"}
                . Máximo de turnos:{" "}
                {campaign.registration.maxTurns ?? "sin límite"}.
              </p>
            )}
            <Link
              href={`/campanas/disponibilidad/${campaign.id}`}
              prefetch={false}
              className="flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-900 focus-visible:ring-offset-2"
            >
              {campaign.status !== "registration_open"
                ? "Revisar disponibilidad"
                : campaign.registration
                  ? "Editar disponibilidad"
                  : "Inscribirme"}
            </Link>
          </article>
        ))}
    </section>
  );
}
