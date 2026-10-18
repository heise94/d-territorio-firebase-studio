"use client";

import { useState } from "react";
import { CircleUserRound, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logoutParticipant } from "../lib/participant-logout";


export function ParticipantProfile({
  fullName,
  congregation,
}: {
  fullName: string;
  congregation: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await logoutParticipant(
        () => {
          navigator.serviceWorker?.controller?.postMessage({
            type: "CAMPAIGNS_LOGOUT",
          });
          if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel("campanas-session");
            channel.postMessage({ type: "CAMPAIGNS_SESSION_CLEARED" });
            channel.close();
          }
        },
        (route) => window.location.replace(route),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos cerrar la sesión.",
      );
      setBusy(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="campaign-secondary gap-2 px-3"
          aria-label="Tu perfil"
        >
          <CircleUserRound aria-hidden="true" className="h-6 w-6" />
          <span>Tu perfil</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%_-_2rem)] rounded-2xl bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tu perfil</DialogTitle>
          <DialogDescription>Tu sesión en Campaña exhibidores.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-slate-600">Nombre</dt>
            <dd className="break-words text-lg font-bold">{fullName}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Congregación</dt>
            <dd className="break-words font-semibold">{congregation}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">
          Cerrar sesión no elimina tu cuenta ni tu participación.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void logout()}
          className="campaign-primary w-full gap-2"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          {busy ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
