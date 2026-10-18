import { Suspense } from "react";
import Image from "next/image";
import { JoinInstall } from "@/modules/campaigns/components/join-install";
import { JoinCampaignCard } from "@/modules/campaigns/components/join-campaign-card";

// Anonymous entry HTML is generated once; current campaign details load separately.
export default function JoinPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg space-y-5 px-5 pb-12 pt-8 sm:pt-12">
      <header className="flex items-center gap-3">
        <Image
          src="/campanas-icon-192.png"
          alt=""
          width={48}
          height={48}
          priority
          className="h-12 w-12 rounded-2xl"
        />
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

      <Suspense fallback={<section role="status" className="campaign-surface p-5">Cargando acceso a la campaña…</section>}><JoinCampaignCard /></Suspense>

      <JoinInstall />
    </main>
  );
}
