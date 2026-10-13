import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/modules/campaigns/server/auth/session";

export const dynamic = "force-dynamic";
export default async function WelcomePage() {
  if (await getCurrentParticipant()) redirect("/campanas");
  return <main className="campaign-page flex min-h-dvh flex-col justify-center gap-6"><div className="flex items-center gap-3"><Image src="/campanas-icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl" /><p className="font-semibold text-[var(--campaign-primary)]">Campaña exhibidores</p></div><section className="campaign-surface space-y-5 p-6"><p className="text-xl font-semibold">Bienvenido/a</p><h1 className="text-4xl font-bold tracking-tight">Participa en la campaña</h1><p className="text-lg text-[var(--campaign-muted)]">Para participar en la campaña, primero debes crear tu cuenta con tu número de teléfono.</p><Link href="/campanas/registro" className="campaign-primary w-full">Crear mi cuenta</Link><p className="text-center text-[var(--campaign-muted)]">Si ya tienes una cuenta, puedes ingresar con tu teléfono y PIN.</p><Link href="/campanas/ingresar" className="campaign-secondary w-full">Ya tengo cuenta</Link></section></main>;
}
