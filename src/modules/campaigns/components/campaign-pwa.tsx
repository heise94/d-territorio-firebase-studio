"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { isAppleMobile, isInstallDismissed } from "../lib/pwa-support";
import { waitForCampaignUpdate } from "../lib/pwa-update";
import { participantLogoutDestination } from "../lib/participant-logout";
import { checkCampaignRegistration, monitorCampaignUpdates } from "../lib/pwa-update-monitor";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type CampaignUpdateContextValue = { checkForUpdate: () => Promise<void>; checking: boolean; message: string };
const CampaignUpdateContext = createContext<CampaignUpdateContextValue | null>(null);
export function useCampaignUpdate() {
  const value = useContext(CampaignUpdateContext);
  if (!value) throw new Error("useCampaignUpdate debe usarse dentro de CampaignPwa");
  return value;
}
const dismissalKey = "campanas-install-dismissed-at";
export function CampaignPwa({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false),
    [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false),
    [dismissed, setDismissed] = useState(true);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateAttempt = useRef<ReturnType<typeof waitForCampaignUpdate> | null>(
    null,
  );
  const reloadStarted = useRef(false);
  const [iosHelp, setIosHelp] = useState(false);
  const pathname = usePathname();
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
        !["/campanas/ingresar", participantLogoutDestination].includes(
          window.location.pathname,
        )
      ) {
        clearingSession = true;
        window.location.replace(participantLogoutDestination);
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
    let mounted = true;
    const registerWorker = () => {
      if (!mounted || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (!mounted) return;
          registrationRef.current = registration;
          cleanupWorker = monitorCampaignUpdates(registration, navigator.serviceWorker, {
            onReady: (worker) => { setWaiting(worker); setShowUpdate(true); },
            isOnline: () => navigator.onLine,
            isVisible: () => document.visibilityState === "visible",
            windowEvents: window, documentEvents: document,
          });
        })
        .catch(() => {});
    };
    // Let the initial page and its critical resources finish before installing.
    const registrationTimer = document.readyState === "complete" ? window.setTimeout(registerWorker, 0) : null;
    if (registrationTimer === null) window.addEventListener("load", registerWorker, { once: true });
    return () => {
      mounted = false;
      if (registrationTimer !== null) window.clearTimeout(registrationTimer);
      window.removeEventListener("load", registerWorker);
      updateAttempt.current?.cancel();
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
  async function update() {
    if (!waiting || updating || updateAttempt.current) return;
    setUpdating(true);
    setUpdateFailed(false);
    setMessage("");
    const attempt = waitForCampaignUpdate(
      navigator.serviceWorker,
      waiting,
      () => waiting.postMessage({ type: "SKIP_WAITING" }),
    );
    updateAttempt.current = attempt;
    const result = await attempt.promise;
    updateAttempt.current = null;
    if (result === "cancelled") return;
    setUpdating(false);
    if (result === "ready") reloadOnce();
    else {
      setUpdateFailed(true);
      setMessage("La actualización no terminó. Puedes recargar la aplicación.");
    }
  }
  async function checkForUpdate() {
    if (checking) return;
    setChecking(true);
    setMessage("");
    try {
      if (!navigator.onLine || !("serviceWorker" in navigator)) throw new Error("unavailable");
      const registration = registrationRef.current ?? await navigator.serviceWorker.getRegistration("/");
      if (!registration) throw new Error("unavailable");
      registrationRef.current = registration;
      const state = await checkCampaignRegistration(registration);
      if (registration.waiting && (navigator.serviceWorker.controller || registration.active)) {
        setWaiting(registration.waiting);
        setShowUpdate(true);
      } else if (state === "installing") setMessage("Se está descargando una actualización. Te avisaremos cuando esté lista.");
      else setMessage("✓ Estás usando la última versión");
    } catch {
      setMessage("No pudimos buscar actualizaciones. Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      setChecking(false);
    }
  }
  function reloadOnce() {
    if (reloadStarted.current) return;
    reloadStarted.current = true;
    window.location.reload();
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
      {waiting && !showUpdate && <aside role="status" aria-live="polite" className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 border-b border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
        <p className="font-semibold">Hay una actualización disponible</p>
        <button type="button" className="rounded-xl bg-teal-800 px-4 py-2 font-semibold text-white" onClick={() => setShowUpdate(true)}>Ver actualización</button>
      </aside>}
      {showUpdate && waiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="campaign-update-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
            <RefreshCw className="mb-4 h-8 w-8 text-teal-700" aria-hidden="true" />
            <h2 id="campaign-update-title" className="text-xl font-bold">{updateFailed ? "No pudimos actualizar" : "Nueva versión disponible"}</h2>
            <p className="mt-2 text-sm text-slate-600">{updateFailed ? "La actualización no terminó. Puedes recargar la aplicación." : "Hay una actualización de Campaña exhibidores lista para instalar."}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold" disabled={updating} onClick={() => { setShowUpdate(false); setUpdateFailed(false); }}>Ahora no</button>
              <button type="button" className="min-h-12 rounded-xl bg-teal-800 px-4 font-semibold text-white" disabled={updating} onClick={() => (updateFailed ? reloadOnce() : void update())}>{updating ? "Actualizando…" : updateFailed ? "Recargar" : "Actualizar ahora"}</button>
            </div>
          </section>
        </div>
      )}
      {pathname === "/campanas" &&
        !installed &&
        !dismissed &&
        (prompt || ios) && (
          <aside className="campaign-surface mx-auto mb-2 flex max-w-md items-center gap-3 p-4">
            <span className="campaign-icon-surface">
              <Download />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Instala la aplicación</p>
              <p className="text-sm text-[var(--campaign-muted)]">
                {iosHelp
                  ? "En Safari: Compartir → Añadir a pantalla de inicio."
                  : "Accede más rápido y recibe avisos importantes."}
              </p>
            </div>
            <div className="grid gap-1">
              <button
                className="campaign-primary min-h-10 rounded-xl px-4"
                onClick={() => (prompt ? void install() : setIosHelp(true))}
              >
                {prompt ? "Instalar" : "Cómo instalar"}
              </button>
              <button
                className="min-h-8 text-sm text-[var(--campaign-muted)]"
                onClick={dismiss}
              >
                Ahora no
              </button>
            </div>
          </aside>
        )}
      <CampaignUpdateContext.Provider value={{ checkForUpdate, checking, message }}>
        {children}
      </CampaignUpdateContext.Provider>
    </>
  );
}
