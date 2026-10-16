"use client";
import { campaignFetch } from "../lib/campaign-fetch";

import { useEffect, useState, type FormEvent } from "react";
import { changePinSchema } from "../schemas/participant-auth";

export function ParticipantSessionControls({ fullName }: { fullName: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => {
      campaignFetch("/api/campanas/auth/session", { cache: "no-store" })
        .then((reply) => {
          if (reply.status === 401) {
            window.location.replace("/campanas/ingresar");
          }
        })
        .catch(() => {
          /* An offline device must not invent an authenticated identity. */
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  async function perform(action: string, input: unknown) {
    setBusy(true);
    setError("");
    try {
      const reply = await campaignFetch(`/api/campanas/auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const result = await reply.json();
      if (!reply.ok) throw new Error(result.error);
      navigator.serviceWorker?.controller?.postMessage({
        type: "CAMPAIGNS_LOGOUT",
      });
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("campanas-session");
        channel.postMessage({ type: "CAMPAIGNS_SESSION_CLEARED" });
        channel.close();
      }
      // A full navigation drops all in-memory private state from the previous identity.
      window.location.replace("/campanas/ingresar");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos conectar.",
      );
    } finally {
      setBusy(false);
    }
  }
  function changePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      ["currentPin", "newPin", "confirmPin"].map((key) => [
        key,
        String(form.get(key) ?? ""),
      ]),
    );
    const parsed = changePinSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    event.currentTarget.reset();
    void perform("change-pin", input);
  }
  return (
    <section
      className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
      aria-label="Mi sesión"
    >
      <p className="font-semibold">Hola, {fullName}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void perform("logout", {})}
        className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold disabled:opacity-50"
      >
        Cerrar sesión
      </button>
      <details>
        <summary className="cursor-pointer py-3 text-sm text-teal-700">
          Cambiar mi PIN
        </summary>
        <form onSubmit={changePin} className="space-y-3">
          {(["currentPin", "newPin", "confirmPin"] as const).map(
            (key, index) => (
              <label key={key} className="block text-sm">
                {["PIN actual", "Nuevo PIN", "Confirmar nuevo PIN"][index]}
                <input
                  name={key}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]{4,6}"
                  minLength={4}
                  maxLength={6}
                  required
                  className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
            ),
          )}
          <p className="text-sm text-slate-600">
            El cambio cerrará todas tus sesiones. Después ingresa con el nuevo
            PIN.
          </p>
          <button
            disabled={busy}
            className="min-h-12 rounded-xl bg-teal-700 px-4 font-semibold text-white disabled:opacity-50"
          >
            Cambiar PIN
          </button>
        </form>
      </details>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
