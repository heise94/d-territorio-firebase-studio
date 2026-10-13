import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { CampaignExhibitorIcon } from "@/modules/campaigns/components/campaign-exhibitor-icon";
import { JoinInstall } from "@/modules/campaigns/components/join-install";
import { getPublicJoinState } from "@/modules/campaigns/server/public-join";
import { getCurrentParticipant } from "@/modules/campaigns/server/auth/session";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const [campaign, participant] = await Promise.all([
    getPublicJoinState(),
    getCurrentParticipant(),
  ]);

  return (
    <main className="mx-auto min-h-dvh max-w-lg space-y-5 px-5 pb-12 pt-8 sm:pt-12">
      <header className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--campaign-primary-strong)] text-white"
          aria-hidden="true"
        >
          <CampaignExhibitorIcon className="h-8 w-8" />
        </span>
        <span className="text-lg font-bold tracking-tight">Campaña exhibidores</span>
      </header>

      <section className="campaign-mint space-y-4 border border-[var(--campaign-line)] px-6 py-7">
        <p className="font-bold text-[var(--campaign-primary-strong)]">
          Campaña especial de predicación
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
          Participa con nosotros
        </h1>
        <p className="text-lg leading-relaxed">
          Crea tu cuenta para indicar los días y horarios en que estás
          disponible. Así podremos organizar los turnos de la campaña.
        </p>
      </section>

      <section className="campaign-surface space-y-5 border border-[var(--campaign-line)]">
        {campaign.kind === "single" && (
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--campaign-primary-strong)]">
              Inscripciones abiertas
            </p>
            <h2 className="text-xl font-bold">{campaign.campaign.name}</h2>
            {campaign.campaign.locationName && (
              <p className="flex items-start gap-2 text-[var(--campaign-muted)]">
                <MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
                {campaign.campaign.locationName}
              </p>
            )}
          </div>
        )}
        {campaign.kind === "none" && (
          <p className="flex items-start gap-2 rounded-2xl bg-[var(--campaign-attention)] p-4 font-medium">
            <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            Las inscripciones todavía no están abiertas.
          </p>
        )}
        {campaign.kind === "multiple" && (
          <p className="rounded-2xl bg-[var(--campaign-mint)] p-4 font-medium">
            Hay campañas con inscripciones abiertas. Después de ingresar,
            podrás verlas y elegir en cuál participar.
          </p>
        )}

        {participant ? (
          <Link href="/campanas" className="campaign-primary w-full gap-2 text-lg">
            Abrir Campaña exhibidores <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        ) : (
          <div className="space-y-3">
            <Link
              href="/campanas/registro"
              className="campaign-primary w-full gap-2 text-lg"
            >
              Crear mi cuenta <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            <Link
              href="/campanas/ingresar"
              className="campaign-secondary w-full text-lg"
            >
              Ya tengo cuenta
            </Link>
          </div>
        )}
      </section>

      <JoinInstall />
    </main>
  );
}
