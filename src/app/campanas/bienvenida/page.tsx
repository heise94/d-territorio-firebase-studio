import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/modules/campaigns/server/auth/session";

export const dynamic = "force-dynamic";
export default async function WelcomePage() {
  if (await getCurrentParticipant()) redirect("/campanas");
  return <main className="campaign-page flex min-h-dvh flex-col justify-center gap-6"><p className="font-semibold text-[var(--campaign-primary)]">Campaña exhibidores</p><section className="campaign-surface space-y-5 p-6"><p className="text-xl font-semibold">Bienvenido/a</p><h1 className="text-4xl font-bold tracking-tight">Participa en la campaña</h1><p className="text-lg text-[var(--campaign-muted)]">Para participar en la campaña, primero debes crear tu cuenta con tu número de teléfono.</p><Link href="/campanas/registro" className="campaign-primary w-full">Crear mi cuenta</Link><p className="text-center text-[var(--campaign-muted)]">Si ya tienes una cuenta, puedes ingresar con tu teléfono y PIN.</p><Link href="/campanas/ingresar" className="campaign-secondary w-full">Ya tengo cuenta</Link></section></main>;
}
