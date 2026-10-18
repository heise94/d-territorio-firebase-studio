export function CampaignLoading() {
  return <main role="status" aria-live="polite" className="campaign-page space-y-5 pt-12">
    <p className="font-semibold text-[var(--campaign-primary)]">Campaña exhibidores</p>
    <h1 className="text-2xl font-bold">Estamos preparando tu ingreso</h1>
    <p className="text-[var(--campaign-muted)]">Cargando la campaña…</p>
    <div aria-hidden="true" className="h-32 animate-pulse rounded-2xl bg-[var(--campaign-mint)] motion-reduce:animate-none" />
  </main>;
}
