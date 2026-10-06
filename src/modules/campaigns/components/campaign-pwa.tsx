"use client";
import { useEffect, useState, type ReactNode } from "react";
import { isAppleMobile, isInstallDismissed } from "../lib/pwa-support";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const dismissalKey = "campanas-install-dismissed-at";
export function CampaignPwa({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false),
    [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false),
    [dismissed, setDismissed] = useState(true);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const refresh = () => {
      setOffline(!navigator.onLine);
      setInstalled(
        standalone.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    };
    refresh();
    setIos(isAppleMobile(navigator.userAgent, navigator.maxTouchPoints));
    try {
      setDismissed(
        isInstallDismissed(localStorage.getItem(dismissalKey), Date.now()),
      );
    } catch {
      setDismissed(false);
    }
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    window.addEventListener("pageshow", pageShow);
    let clearingSession = false;
    const sessionCleared = (event: MessageEvent) => {
      if (
        !clearingSession &&
        event.data?.type === "CAMPAIGNS_SESSION_CLEARED" &&
        window.location.pathname !== "/campanas/ingresar"
      ) {
        clearingSession = true;
        window.location.replace("/campanas/ingresar");
      }
    };
    const sessionChannel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("campanas-session")
        : null;
    sessionChannel?.addEventListener("message", sessionCleared);
    navigator.serviceWorker?.addEventListener("message", sessionCleared);
    standalone.addEventListener("change", refresh);
    let cleanupWorker = () => {};
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          const check = () => {
            if (registration.waiting && navigator.serviceWorker.controller)
              setWaiting(registration.waiting);
          };
          const update = () => {
            const worker = registration.installing;
            if (worker) worker.addEventListener("statechange", check);
          };
          check();
          registration.addEventListener("updatefound", update);
          cleanupWorker = () =>
            registration.removeEventListener("updatefound", update);
          void registration.update().catch(() => {});
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
      window.removeEventListener("pageshow", pageShow);
      sessionChannel?.close();
      navigator.serviceWorker?.removeEventListener("message", sessionCleared);
      standalone.removeEventListener("change", refresh);
      cleanupWorker();
    };
  }, []);
  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissalKey, String(Date.now()));
    } catch {}
  }
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    setPrompt(null);
    if (result.outcome === "dismissed") dismiss();
  }
  function update() {
    if (!waiting || updating) return;
    if (
      !window.confirm(
        "Actualizar recargará la aplicación. Los formularios sin enviar no se guardarán. ¿Continuar?",
      )
    )
      return;
    setUpdating(true);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }
  if (offline)
    return (
      <main className="mx-auto max-w-md space-y-5 p-6 pt-16">
        <h1 className="text-3xl font-bold">Sin conexión</h1>
        <p>Necesitas conexión para actualizar información de la campaña.</p>
        <p>No pudimos actualizar porque estás sin conexión.</p>
        <p>
          Los cambios no se enviaron. Puedes reintentarlos al volver a
          conectarte.
        </p>
        <button
          className="min-h-12 rounded-xl border border-teal-800 px-5 font-semibold"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </main>
    );
  return (
    <>
      {waiting && (
        <aside
          role="status"
          className="mx-auto max-w-md border border-teal-700 bg-teal-50 p-4"
        >
          <p>Hay una actualización disponible.</p>
          <button
            className="min-h-12 font-semibold underline"
            disabled={updating}
            onClick={update}
          >
            {updating ? "Actualizando…" : "Actualizar"}
          </button>
        </aside>
      )}
      {!installed && !dismissed && (prompt || ios) && (
        <aside className="mx-auto max-w-md space-y-2 rounded-2xl border bg-white p-5">
          <p className="font-bold">Instalar aplicación</p>
          {prompt ? (
            <button
              className="min-h-12 rounded-xl bg-teal-700 px-5 font-semibold text-white"
              onClick={() => void install()}
            >
              Instalar aplicación
            </button>
          ) : (
            <p>
              En iPhone o iPad: abre Compartir → Añadir a pantalla de inicio.
            </p>
          )}
          <button className="ml-4 min-h-12 underline" onClick={dismiss}>
            Ahora no
          </button>
        </aside>
      )}
      {children}
    </>
  );
}
