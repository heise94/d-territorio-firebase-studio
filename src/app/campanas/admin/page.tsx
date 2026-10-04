import { CampaignAdmin } from '@/modules/campaigns/components/campaign-admin';
/*
import {
  Bell,
  CalendarRange,
  ChevronLeft,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  Settings2,
  Users,
} from 'lucide-react';

const sections = [
  { label: 'Resumen', icon: LayoutDashboard, active: true },
  { label: 'Participantes', icon: Users },
  { label: 'Cobertura', icon: Gauge },
  { label: 'Planificación', icon: ClipboardList },
  { label: 'Puntos', icon: MapPinned },
  { label: 'Programa', icon: FileText },
  { label: 'Notificaciones', icon: Bell },
  { label: 'Configuración', icon: Settings2 },
];

export default function CampaignAdminShellPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-[#E2E8F0] bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CCFBF1] text-[#0F766E]">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F766E]">D-Territorio</p>
            <p className="text-lg font-bold">Campañas</p>
          </div>
        </div>

        <nav className="hidden space-y-1 px-3 pb-6 lg:block" aria-label="Panel de organización">
          {sections.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                active ? 'bg-[#CCFBF1] text-[#0F766E]' : 'text-[#475569]'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <section className="min-w-0">
        <header className="border-b border-[#E2E8F0] bg-white px-5 py-5 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0F766E]">Panel de organización</p>
              <h1 className="mt-1 text-2xl font-bold lg:text-3xl">Base del módulo Campañas</h1>
            </div>
            <Link
              href="/campanas"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Vista participante
            </Link>
          </div>
        </header>

        <div className="space-y-6 p-5 lg:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Campañas', 'Configurables', CalendarRange],
              ['Participantes', 'Próxima fase', Users],
              ['Planificación', 'Manual', ClipboardList],
              ['Programa', 'Generado desde datos', FileText],
            ].map(([label, value, Icon]) => {
              const CardIcon = Icon as typeof CalendarRange;
              return (
                <div
                  key={label as string}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0F766E]">
                    <CardIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-[#64748B]">{label as string}</p>
                  <p className="mt-1 text-lg font-bold">{value as string}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F766E]">Fase 0</p>
                  <h2 className="mt-1 text-xl font-bold">Preparación técnica</h2>
                </div>
                <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">
                  En construcción
                </span>
              </div>

              <div className="space-y-3 text-sm leading-6 text-[#475569]">
                <p>Este shell valida la separación visual y estructural del dominio Campañas.</p>
                <p>No contiene todavía datos reales, autenticación de participantes ni lógica de asignaciones.</p>
                <p>Las próximas fases se implementarán siguiendo `docs/campanas/DEVELOPMENT_PLAN.md`.</p>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <h2 className="text-lg font-bold">Principios V1</h2>
              <ul className="mt-4 space-y-3 text-sm text-[#475569]">
                <li className="rounded-xl bg-[#F8FAFC] px-4 py-3">Campañas separado de Territorios.</li>
                <li className="rounded-xl bg-[#F8FAFC] px-4 py-3">Parejas siempre definidas por humanos.</li>
                <li className="rounded-xl bg-[#F8FAFC] px-4 py-3">Bloques, puntos y capacidades configurables.</li>
                <li className="rounded-xl bg-[#F8FAFC] px-4 py-3">PWA simple para participantes.</li>
              </ul>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
*/

export default function CampaignAdminPage() {
  return <main className="min-h-screen bg-[#F7F9FC] p-5 lg:p-8"><div className="mx-auto max-w-6xl"><CampaignAdmin /></div></main>;
}
