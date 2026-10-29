"use client";
import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { campaignFetch } from "../lib/campaign-fetch";

export function ResetParticipantPin({ campaignId, registrationId, fullName, adminToken }: { campaignId: string; registrationId: string; fullName: string; adminToken?: () => Promise<string> }) {
  const [open, setOpen] = useState(false), [pin, setPin] = useState(""), [confirm, setConfirm] = useState(""), [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  const close = () => { if (!busy) { setOpen(false); setPin(""); setConfirm(""); setError(""); setVisible(false); setDone(false); } };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!/^\d{4,6}$/.test(pin)) return setError("Ingresa un PIN de 4 a 6 números.");
    if (pin !== confirm) return setError("Los PIN no coinciden.");
    setBusy(true);
    try {
      const base = adminToken ? "admin" : "organization";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers.Authorization = `Bearer ${await adminToken()}`;
      const reply = await campaignFetch(`/api/campanas/${base}/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(registrationId)}/reset-pin`, { method: "POST", headers, body: JSON.stringify({ newPin: pin }) });
      const result = await reply.json();
      if (!reply.ok) throw new Error(result.error ?? "No se pudo cambiar el PIN.");
      setPin(""); setConfirm(""); setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo cambiar el PIN."); }
    finally { setBusy(false); }
  };
  return <><button type="button" onClick={() => setOpen(true)} className="campaign-secondary w-full">Restablecer PIN</button>
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white p-5 sm:max-w-md">
      <DialogHeader><DialogTitle>Restablecer PIN</DialogTitle><DialogDescription>Para {fullName}. Este cambio se aplica a su cuenta en todas sus campañas y cerrará sus sesiones anteriores.</DialogDescription></DialogHeader>
      {done ? <div className="space-y-4"><p role="status" className="rounded-xl bg-teal-50 p-3 text-teal-900">El PIN temporal quedó guardado. Compártelo directamente con la persona: al ingresar deberá crear un PIN propio.</p><button type="button" onClick={close} className="campaign-primary w-full">Entendido</button></div> : <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-sm font-semibold">PIN temporal<input autoComplete="off" type={visible ? "text" : "password"} inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" /></label>
        <label className="block text-sm font-semibold">Repite el PIN temporal<input autoComplete="off" type={visible ? "text" : "password"} inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ""))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Mostrar PIN</label>
        <p className="text-sm text-slate-600">Anota este PIN antes de guardarlo y compártelo solo con la persona. Al ingresar deberá elegir uno propio.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button className="campaign-primary w-full" disabled={busy}>{busy ? "Guardando…" : "Guardar PIN temporal"}</button>
      </form>}
    </DialogContent></Dialog></>;
}
