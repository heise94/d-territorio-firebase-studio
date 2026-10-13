"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share2, Smartphone } from "lucide-react";
import { isAppleMobile } from "../lib/pwa-support";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function JoinInstall() {
  const [device, setDevice] = useState<"checking" | "ios" | "android" | "other">(
    "checking",
  );
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const refresh = () =>
      setInstalled(
        standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setNotice("");
    };
    refresh();
    setDevice(
      isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)
        ? "ios"
        : /Android/i.test(navigator.userAgent)
          ? "android"
          : "other",
    );
    standalone.addEventListener("change", refresh);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone.removeEventListener("change", refresh);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome !== "accepted")
        setNotice("Puedes seguir usando Campaña exhibidores sin instalarla.");
      else setNotice("Instalación iniciada. Puedes continuar con tu cuenta.");
    } catch {
      setNotice("No pudimos abrir la instalación. Puedes seguir en el navegador.");
    }
  }

  return (
    <section
      aria-labelledby="join-install-title"
      className="campaign-surface space-y-4 border border-[var(--campaign-line)]"
    >
      <div className="flex items-start gap-4">
        <span className="campaign-icon-surface" aria-hidden="true">
          <Smartphone className="h-7 w-7" />
        </span>
        <div>
          <h2 id="join-install-title" className="text-xl font-bold leading-snug">
            Instala Campaña exhibidores en tu teléfono
          </h2>
          <p className="mt-2 leading-relaxed text-[var(--campaign-muted)]">
            Puedes instalar la aplicación para abrirla fácilmente desde tu
            pantalla de inicio.
          </p>
        </div>
      </div>

      {installed ? (
        <p className="flex items-center gap-2 font-semibold text-[var(--campaign-primary-strong)]">
          <Check aria-hidden="true" className="h-5 w-5" /> Aplicación instalada
        </p>
      ) : prompt ? (
        <button
          type="button"
          onClick={() => void install()}
          className="campaign-secondary w-full gap-2 text-lg"
        >
          <Download aria-hidden="true" className="h-5 w-5" />
          Instalar Exhibidores
        </button>
      ) : device === "ios" ? (
        <div className="rounded-2xl bg-[var(--campaign-mint)] p-4">
          <h3 className="font-bold">En iPhone o iPad</h3>
          <ol className="mt-2 space-y-2 pl-5 leading-relaxed list-decimal">
            <li>Abre esta página en Safari.</li>
            <li>
              <span className="inline-flex items-center gap-2">
                Toca Compartir <Share2 aria-hidden="true" className="h-5 w-5" />.
              </span>
            </li>
            <li>Elige «Agregar a pantalla de inicio».</li>
          </ol>
        </div>
      ) : device === "android" ? (
        <p className="text-sm leading-relaxed text-[var(--campaign-muted)]">
          Si no aparece la instalación, abre el menú de Chrome y elige «Instalar
          aplicación».
        </p>
      ) : null}
      {notice && <p role="status" className="text-sm font-medium">{notice}</p>}
      <p className="text-sm font-medium text-[var(--campaign-muted)]">
        Instalarla es opcional. También puedes participar desde el navegador.
      </p>
    </section>
  );
}
