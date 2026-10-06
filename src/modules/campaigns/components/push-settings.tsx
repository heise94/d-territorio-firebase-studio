"use client";
import { useEffect, useState } from "react";
import { app } from "@/lib/firebase";
import { campaignFetch } from "../lib/campaign-fetch";
import { isAppleMobile } from "../lib/pwa-support";

export function PushSettings() {
  const [state, setState] = useState("Revisando notificaciones…"),
    [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const configured =
    !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  useEffect(() => {
    let live = true;
    let stopForeground: (() => void) | undefined;
    void (async () => {
      if (!configured) {
        if (live) setState("No configuradas en este entorno");
        return;
      }
      const messaging = await import("firebase/messaging");
      const available =
        window.isSecureContext && (await messaging.isSupported());
      if (!live) return;
      setSupported(available);
      if (!available) {
        setState(
          isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)
            ? "En iPhone/iPad, añade Campañas a la pantalla de inicio y revisa las notificaciones allí."
            : "No disponibles en este navegador",
        );
        return;
      }
      const response = await campaignFetch(
        "/api/campanas/participant/push/status",
      );
      if (!response.ok)
        throw new Error("No pudimos revisar las notificaciones.");
      const status = await response.json();
      if (!live) return;
      setEnabled(status.enabled);
      const client = messaging.getMessaging(app);
      stopForeground = messaging.onMessage(client, (payload) => {
        const id = payload.data?.eventId;
        if (!id || !/^[a-f0-9]{64}$/.test(id)) return;
        void campaignFetch(
          `/api/campanas/participant/notifications/push-event?id=${id}`,
        )
          .then((response) => {
            if (live && response.ok)
              window.dispatchEvent(new Event("campanas-notification"));
          })
          .catch(() => {});
      });
      // Refresh a rotated token only for an already opted-in device. Never prompt here.
      if (status.enabled && Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration?.active) {
          const fcmToken = await messaging.getToken(client, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
          const response = await campaignFetch(
            "/api/campanas/participant/push/subscribe",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fcmToken, platform: devicePlatform() }),
            },
          );
          if (!response.ok)
            throw new Error(
              "No pudimos actualizar las notificaciones de este dispositivo.",
            );
        }
      }
      if (!live) return;
      setState(
        Notification.permission === "denied"
          ? "Permiso bloqueado"
          : status.enabled && Notification.permission === "granted"
            ? "Notificaciones activadas"
            : "Notificaciones desactivadas",
      );
    })().catch((error) => {
      if (live) {
        setState("Notificaciones desactivadas");
        setError(pushFailureMessage(error));
      }
    });
    return () => {
      live = false;
      stopForeground?.();
    };
  }, [configured]);
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (enabled) {
        const response = await campaignFetch(
          "/api/campanas/participant/push/unsubscribe",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        );
        if (!response.ok) throw new Error((await response.json()).error);
        setEnabled(false);
        setState("Notificaciones desactivadas");
        try {
          const m = await import("firebase/messaging");
          await m.deleteToken(m.getMessaging(app));
        } catch {}
        return;
      }
      const permission = await Notification.requestPermission(); // Only after this contextual click.
      if (permission !== "granted") {
        setState(
          permission === "denied"
            ? "Permiso bloqueado"
            : "Notificaciones desactivadas",
        );
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration?.active)
        throw new Error(
          "La aplicación todavía no está preparada para push. Intenta después de actualizarla.",
        );
      const m = await import("firebase/messaging");
      const fcmToken = await m.getToken(m.getMessaging(app), {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      const response = await campaignFetch(
        "/api/campanas/participant/push/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcmToken, platform: devicePlatform() }),
        },
      );
      if (!response.ok) throw new Error((await response.json()).error);
      setEnabled(true);
      setState("Notificaciones activadas");
    } catch (failure) {
      setError(pushFailureMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-2xl border bg-white p-5"
      aria-label="Notificaciones de este dispositivo"
    >
      <h2 className="text-xl font-bold">Notificaciones de este dispositivo</h2>
      <p>{state}</p>
      <p>
        Activa las notificaciones para recibir avisos sobre solicitudes,
        asignaciones y cambios importantes.
      </p>
      <p>
        Si no las activas, todos tus avisos seguirán disponibles dentro de la
        aplicación.
      </p>
      {state === "Permiso bloqueado" && (
        <p>Puedes revisar el permiso desde la configuración del navegador.</p>
      )}
      {supported && (enabled || state !== "Permiso bloqueado") && (
        <button
          disabled={busy}
          className="min-h-12 rounded-xl bg-teal-700 px-4 font-semibold text-white disabled:opacity-50"
          onClick={() => void toggle()}
        >
          {busy
            ? "Espera un momento…"
            : enabled
              ? "Desactivar notificaciones"
              : "Activar notificaciones"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}

function devicePlatform() {
  return isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)
    ? "ios"
    : /Android/.test(navigator.userAgent)
      ? "android"
      : "desktop";
}

function pushFailureMessage(error: unknown) {
  // SDK responses are not trusted display text: never echo a token/credential.
  return error instanceof Error && error.name !== "FirebaseError"
    ? error.message
    : "No pudimos actualizar las notificaciones. Intenta nuevamente más tarde.";
}
