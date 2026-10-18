"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usesParticipantStartup } from "@/modules/campaigns/lib/startup";

const PlatformAuthProvider = dynamic(
  () => import("@/hooks/use-auth").then((module) => module.AuthProvider),
  { loading: () => <p role="status" className="p-6 text-center text-slate-600">Cargando acceso…</p> },
);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (usesParticipantStartup(pathname)) return <>{children}</>;
  return <PlatformAuthProvider>{children}</PlatformAuthProvider>;
}
