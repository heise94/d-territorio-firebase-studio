"use client";

import { useEffect, useState } from "react";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function CampaignAdminParticipantAccessPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const reply = await fetch("/api/campanas/admin/participant-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const result = await reply.json();
        if (!reply.ok) throw new Error(result.error);
        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, result.token);
        if (active) {
          const candidate = new URLSearchParams(window.location.search).get("returnTo");
          const modules = ["resumen", "campana", "participantes", "planificar", "programa", "cambios", "mi-congregacion"];
          const target = candidate ? new URL(candidate, window.location.origin) : null;
          const targetParts = target?.pathname.split("/");
          const isSafeCampaignRoute = !!target &&
            target.origin === window.location.origin &&
            modules.includes(targetParts?.[3] ?? "") &&
            targetParts?.[4] === encodeURIComponent(result.campaignId) &&
            !target.pathname.includes("\\");
          const safeReturnTo = isSafeCampaignRoute && target
            ? `${target.pathname}${target.search}${target.hash}`
            : `/campanas/admin/resumen/${encodeURIComponent(result.campaignId)}`;
          router.replace(safeReturnTo);
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo abrir la administración.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5f1] p-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-teal-800">Campaña exhibidores</p>
        <h1 className="mt-2 text-2xl font-bold">Abriendo administración</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
            <div className="mt-5 flex flex-col items-start gap-3 text-sm font-semibold">
              <a className="text-teal-800 underline" href="/campanas/ingresar?modo=administracion">Ingresar con teléfono y PIN</a>
              <a className="text-slate-600 underline" href="/">Volver al inicio de sesión web</a>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Verificando tu acceso a la campaña…</p>
        )}
      </section>
    </main>
  );
}
