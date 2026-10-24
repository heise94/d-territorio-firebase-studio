"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CampaignInvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [details, setDetails] = useState<{ email: string; campaign: string; congregation: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Cargando invitación…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/campanas/invitacion/${encodeURIComponent(params.token)}`, { cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setDetails(body); setMessage(""); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "El enlace no es válido."));
  }, [params.token]);
  async function activate(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setMessage("Las contraseñas no coinciden.");
    setBusy(true); setMessage("Activando cuenta…");
    try {
      const response = await fetch(`/api/campanas/invitacion/${encodeURIComponent(params.token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage("Cuenta activada. Ahora puedes iniciar sesión.");
      setTimeout(() => router.push("/login"), 900);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo activar la cuenta."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Activa tu acceso a Campañas</CardTitle><CardDescription>{details ? <>Correo: <strong>{details.email}</strong><br />{details.campaign} · {details.congregation}</> : message}</CardDescription></CardHeader><CardContent>{details && <form onSubmit={activate} className="space-y-4"><label className="grid gap-2 text-sm font-semibold">Crea tu contraseña<Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Confirma tu contraseña<Input type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label><Button className="w-full" disabled={busy}>{busy ? "Activando…" : "Activar cuenta"}</Button><p role="status" className="text-sm text-slate-600">{message}</p></form>}</CardContent></Card></main>;
}
