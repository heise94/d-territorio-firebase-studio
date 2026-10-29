"use client";
import { useState, type FormEvent } from "react";
import { campaignFetch } from "../lib/campaign-fetch";
import { changePinSchema } from "../schemas/participant-auth";

export function ParticipantChangeRequiredPin() {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const input = { currentPin: String(form.get("currentPin") ?? ""), newPin: String(form.get("newPin") ?? ""), confirmPin: String(form.get("confirmPin") ?? "") };
    const parsed = changePinSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Revisa tu PIN.");
    if (input.currentPin === input.newPin) return setError("Elige un PIN distinto al PIN temporal.");
    setBusy(true);
    try {
      const reply = await campaignFetch("/api/campanas/auth/change-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await reply.json(); if (!reply.ok) throw new Error(result.error ?? "No se pudo cambiar el PIN.");
      window.location.replace("/campanas/ingresar?pin=actualizado");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo cambiar el PIN."); setBusy(false); }
  };
  return <main className="mx-auto max-w-md px-5 py-10"><p className="font-semibold text-teal-700">Campaña exhibidores</p><h1 className="mt-3 text-2xl font-bold">Crea tu PIN personal</h1><p className="mt-2 text-sm text-slate-600">Ingresaste con un PIN temporal. Elige uno propio para continuar.</p><form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-2xl border bg-white p-5">
    {([ ["currentPin", "PIN temporal"], ["newPin", "Nuevo PIN personal"], ["confirmPin", "Repite tu nuevo PIN"] ] as const).map(([name, label]) => <label key={name} className="block text-sm font-semibold">{label}<input name={name} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" /></label>)}
    <p className="text-sm text-slate-600">Debe tener entre 4 y 6 números y ser distinto al PIN temporal.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="campaign-primary w-full" disabled={busy}>{busy ? "Guardando…" : "Guardar mi PIN"}</button>
  </form></main>;
}
