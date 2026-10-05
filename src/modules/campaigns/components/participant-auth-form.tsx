"use client";
import { campaignFetch } from "../lib/campaign-fetch";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginSchema, registrationSchema } from "../schemas/participant-auth";

const inputClass =
  "mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-700";
export function ParticipantAuthForm({
  register = false,
}: {
  register?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [congregations, setCongregations] = useState<
    { id: string; name: string }[]
  >([]);
  const [congregationsReady, setCongregationsReady] = useState(!register);
  useEffect(() => {
    if (!register) return;
    let disposed = false;
    campaignFetch("/api/campanas/auth/congregations", { cache: "no-store" })
      .then(async (reply) => {
        if (!reply.ok)
          throw new Error(
            "No pudimos cargar las congregaciones. Recarga la página para intentar nuevamente.",
          );
        const result = await reply.json();
        if (!disposed) {
          setCongregations(result.congregations);
          setCongregationsReady(true);
        }
      })
      .catch((failure: Error) => {
        if (!disposed) setError(failure.message);
      });
    return () => {
      disposed = true;
    };
  }, [register]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      phone: String(form.get("phone") ?? ""),
      pin: String(form.get("pin") ?? ""),
      ...(register
        ? {
            fullName: String(form.get("fullName") ?? ""),
            confirmPin: String(form.get("confirmPin") ?? ""),
            ...(form.get("congregationId")
              ? { congregationId: String(form.get("congregationId")) }
              : {}),
          }
        : {}),
    };
    const parsed = (register ? registrationSchema : loginSchema).safeParse(
      input,
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const reply = await campaignFetch(
        `/api/campanas/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store",
        },
      );
      const result = await reply.json();
      if (!reply.ok) throw new Error(result.error);
      formElement.reset();
      router.replace("/campanas");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos conectar. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="font-semibold text-teal-700">D-Territorio · Campañas</p>
      <h1 className="mt-3 text-2xl font-bold">
        {register ? "Crear mi perfil" : "Ingresar"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Tu teléfono y PIN te permiten ingresar. La sesión se mantiene en este
        dispositivo hasta que cierres sesión o venza.
      </p>
      <form
        onSubmit={submit}
        className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
        aria-busy={busy}
      >
        {register && (
          <label className="block font-medium">
            Nombre completo
            <input
              className={inputClass}
              name="fullName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
        )}
        <label className="block font-medium">
          Teléfono
          <input
            className={inputClass}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9 1234 5678"
            required
            maxLength={40}
          />
        </label>
        {register && (
          <label className="block font-medium">
            Congregación
            <select
              className={inputClass}
              name="congregationId"
              disabled={!congregationsReady}
            >
              <option value="">
                {congregationsReady
                  ? "Sin congregación por ahora"
                  : "Cargando…"}
              </option>
              {congregations.map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block font-medium">
          PIN
          <input
            className={inputClass}
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{4,6}"
            minLength={4}
            maxLength={6}
            required
            aria-describedby="pin-help"
          />
        </label>
        <p id="pin-help" className="text-sm text-slate-600">
          De 4 a 6 números. No lo compartas.
        </p>
        {register && (
          <label className="block font-medium">
            Confirmar PIN
            <input
              className={inputClass}
              name="confirmPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{4,6}"
              minLength={4}
              maxLength={6}
              required
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy || !congregationsReady}
          className="min-h-12 w-full rounded-xl bg-teal-700 px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Espera un momento…" : register ? "Crear perfil" : "Ingresar"}
        </button>
      </form>
      <div className="mt-6 space-y-4 text-sm">
        <Link
          className="block text-teal-700 underline"
          href={register ? "/campanas/ingresar" : "/campanas/registro"}
        >
          {register ? "Ya tengo un perfil" : "Primer acceso: crear perfil"}
        </Link>
        <Link
          className="block text-teal-700 underline"
          href="/campanas/recuperar"
        >
          No recuerdo mi PIN
        </Link>
      </div>
    </main>
  );
}
