import Link from 'next/link';
import { requireParticipantSession } from '@/modules/campaigns/server/auth/session';
import { ParticipantSessionControls } from '@/modules/campaigns/components/participant-session';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  Home,
  Info,
  ListChecks,
  Megaphone,
  Smartphone,
} from 'lucide-react';

const navItems = [
  { label: 'Inicio', icon: Home, active: true },
  { label: 'Disponibilidad', icon: CalendarDays },
  { label: 'Mi programa', icon: ListChecks },
  { label: 'Avisos', icon: Bell },
  { label: 'Información', icon: Info },
];

export const dynamic = 'force-dynamic';

export default async function CampaignParticipantShellPage() {
  const participant = await requireParticipantSession();
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#F7F9FC] pb-28">
      <header className="border-b border-[#E2E8F0] bg-white px-5 pb-5 pt-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#CCFBF1] text-[#0F766E]">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F766E]">D-Territorio</p>
              <h1 className="truncate text-xl font-bold">Campañas</h1>
            </div>
          </div>
          <span className="rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
            Base V1
          </span>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex items-start gap-3">
            <CircleDot className="mt-0.5 h-5 w-5 shrink-0 text-[#0F766E]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Experiencia participante</p>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                Este es el shell móvil inicial. La inscripción, disponibilidad y programa real se implementarán en fases posteriores.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-5 px-5 py-6">
        <ParticipantSessionControls fullName={participant.fullName} />
        <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0F766E]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Próxima función</p>
              <h2 className="text-lg font-bold">Inscripción y disponibilidad</h2>
            </div>
          </div>
          <p className="text-base leading-7 text-[#475569]">
            Aquí aparecerán los bloques horarios configurados por cada campaña y el estado de cobertura de cada uno.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Clock3 className="mb-3 h-5 w-5 text-[#0F766E]" aria-hidden="true" />
            <p className="text-sm font-semibold">Horarios</p>
            <p className="mt-1 text-sm text-[#64748B]">Configurables por campaña</p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Smartphone className="mb-3 h-5 w-5 text-[#0F766E]" aria-hidden="true" />
            <p className="text-sm font-semibold">PWA</p>
            <p className="mt-1 text-sm text-[#64748B]">Mobile-first e instalable</p>
          </div>
        </div>

        <Link
          href="/campanas/admin"
          className="flex min-h-12 items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 font-semibold transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-3">
            <Info className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
            Ver shell administrador
          </span>
          <ChevronRight className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
        </Link>
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-[#E2E8F0] bg-white/95 px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
        aria-label="Navegación principal de Campañas"
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-xs font-semibold ${
                active ? 'bg-[#CCFBF1] text-[#0F766E]' : 'text-[#64748B]'
              }`}
            >
              <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </nav>
    </main>
  );
}
