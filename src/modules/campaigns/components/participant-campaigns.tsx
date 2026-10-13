"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
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
          <article key={campaign.id} className="space-y-4 rounded-[20px] border border-[#F2B29B] bg-[#FFF0E8] p-5 shadow-[0_10px_28px_rgba(110,56,39,0.08)]">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-[var(--campaign-primary-strong)]"><CalendarDays aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#704331]">Campaña</p>
                <h2 className="text-xl font-bold leading-snug">{campaign.name}</h2>
                <p className="mt-2 inline-flex rounded-full bg-white/75 px-3 py-1 text-sm font-semibold text-[var(--campaign-primary-strong)]">
                  {campaign.status === "registration_open"
                    ? "Inscripciones abiertas"
                    : "Inscripciones cerradas · solo consulta"}
                </p>
              </div>
            </div>
            {campaign.description && (
              <p className="leading-7">{campaign.description}</p>
            )}
            {campaign.locationName && (
              <p className="flex items-start gap-2 text-slate-700"><MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />{campaign.locationName}</p>
            )}
            <Link
              href={`/campanas/disponibilidad/${campaign.id}`}
              prefetch={false}
              className="campaign-primary w-full gap-2 bg-[#075e55] text-white hover:bg-[#064b44]"
            >
              {campaign.status !== "registration_open"
                ? "Revisar disponibilidad"
                : campaign.registration
                  ? "Editar mi disponibilidad"
                  : "Ingresar mi disponibilidad"}<ChevronRight className="ml-auto h-5 w-5" />
            </Link>
          </article>
        ))}
    </section>
  );
}
