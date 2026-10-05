"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type {
  PairCandidate,
  PairRequestDTO,
  PairRequestView,
} from "../domain/pair-request";
import { pairSearchSchema } from "../schemas/pair-request-schemas";

const buttonBase =
  "min-h-12 rounded-xl border px-4 font-semibold focus-visible:ring-2 focus-visible:ring-teal-700 disabled:opacity-60";
const button = `${buttonBase} border-slate-300 bg-white`;
const primary = `${buttonBase} border-teal-700 bg-teal-700 text-white`;
const statusLabels = {
  pending: "Pendiente de confirmación",
  accepted: "Aceptada · vínculo obligatorio",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};
function fullDate(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
export function PairRequests({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const url = `/api/campanas/participant/campaigns/${campaignId}`;
  const [view, setView] = useState<PairRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PairCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [candidate, setCandidate] = useState<PairCandidate | null>(null);
  const [accepting, setAccepting] = useState<PairRequestDTO | null>(null);
  const searchVersion = useRef(0);
  const read = useCallback(
    async (reply: Response) => {
      if (reply.status === 401) {
        router.replace("/campanas/ingresar");
        router.refresh();
      }
      const data = await reply.json();
      if (!reply.ok) throw new Error(data.error);
      return data;
    },
    [router],
  );
  const load = useCallback(async () => {
    return (await read(
      await fetch(`${url}/pair-requests`, { cache: "no-store" }),
    )) as PairRequestView;
  }, [read, url]);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    const refresh = async () => {
      try {
        const next = await load();
        if (!disposed) setView(next);
      } catch (failure) {
        if (!disposed)
          setError(
            failure instanceof Error ? failure.message : "No pudimos conectar.",
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void refresh();
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 30_000);
    return () => {
      disposed = true;
      window.removeEventListener("focus", focus);
      window.clearInterval(timer);
    };
  }, [load]);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setView(await load());
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos conectar.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!pairSearchSchema.safeParse(query).success) {
      setError("Escribe al menos dos caracteres del nombre (máximo 80).");
      return;
    }
    const version = ++searchVersion.current;
    setBusy(true);
    setResults([]);
    setSearched(false);
    setCandidate(null);
    try {
      const data = await read(
        await fetch(`${url}/pair-candidates?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        }),
      );
      if (version === searchVersion.current) {
        setResults(data.candidates);
        setSearched(true);
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos buscar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function mutate(
    input:
      | { action: "create"; recipientRegistrationId: string }
      | { action: "accept" | "reject" | "cancel"; requestId: string },
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await read(
        await fetch(`${url}/pair-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store",
        }),
      );
      setCandidate(null);
      setAccepting(null);
      setResults([]);
      setSearched(false);
      setMessage(
        input.action === "create"
          ? "Solicitud enviada. Pendiente de confirmación."
          : input.action === "accept"
            ? "Solicitud aceptada. Cuando sean asignados, deberán ir juntos."
            : input.action === "reject"
              ? "Solicitud rechazada."
              : "Solicitud cancelada.",
      );
      try {
        setView(await load());
      } catch {
        setError(
          "La acción se guardó, pero no pudimos actualizar la pantalla. Recarga para verla.",
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos guardar. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading && !view) return <p role="status">Cargando solicitudes…</p>;
  return (
    <div className="space-y-6" aria-busy={busy || loading}>
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">Participar con otro hermano</h1>
        {view && <p className="font-semibold">{view.campaign.name}</p>}
        <p className="leading-7">
          Usa esta opción solo si necesitan ser asignados juntos. La
          organización realizará las asignaciones manualmente; esta solicitud no
          confirma un turno.
        </p>
      </header>
      {message && (
        <p role="status" className="rounded-xl bg-teal-50 p-4">
          {message}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <p>{error}</p>
          <button
            type="button"
            disabled={busy || loading}
            className={button}
            onClick={() => void refresh()}
          >
            Recargar solicitudes
          </button>
        </div>
      )}
      {view && !view.editable && (
        <p className="rounded-xl border border-slate-300 p-4">
          Solo consulta. Para buscar, enviar o responder necesitas una
          inscripción activa y las inscripciones abiertas.
        </p>
      )}
      {view?.editable && (
        <section className="space-y-4" aria-label="Buscar participante">
          <form onSubmit={search} className="space-y-3">
            <label className="block font-semibold">
              Nombre del hermano o hermana
              <input
                value={query}
                minLength={2}
                maxLength={80}
                onChange={(event) => {
                  setQuery(event.target.value);
                  searchVersion.current++;
                  setResults([]);
                  setSearched(false);
                  setCandidate(null);
                }}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
              />
            </label>
            <button disabled={busy} className={primary}>
              Buscar por nombre
            </button>
          </form>
          <p className="text-sm text-slate-600">
            Solo inscritos activos de esta campaña. Hasta 10 coincidencias;
            escribe más del nombre para precisar.
          </p>
          {searched && !results.length && (
            <p>
              No encontramos coincidencias. La persona debe estar inscrita en
              esta campaña.
            </p>
          )}
          {results.map((result) => (
            <button
              key={result.registrationId}
              disabled={busy}
              type="button"
              className={`${button} w-full py-3 text-left`}
              onClick={() => {
                setCandidate(result);
                setAccepting(null);
              }}
            >
              <span className="block">{result.fullName}</span>
              <span className="block text-sm font-normal text-slate-600">
                {result.congregation || "Congregación no indicada"}
              </span>
            </button>
          ))}
          {candidate && (
            <section
              aria-label="Confirmar envío"
              className="space-y-4 rounded-2xl border-2 border-teal-700 p-5"
            >
              <p>
                Si {candidate.fullName} acepta, deberán ser asignados juntos en
                esta campaña.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  type="button"
                  className={button}
                  onClick={() => setCandidate(null)}
                >
                  Cancelar
                </button>
                <button
                  disabled={busy}
                  type="button"
                  className={primary}
                  onClick={() =>
                    void mutate({
                      action: "create",
                      recipientRegistrationId: candidate.registrationId,
                    })
                  }
                >
                  Enviar solicitud
                </button>
              </div>
            </section>
          )}
        </section>
      )}
      {accepting && view?.editable && (
        <section
          aria-label="Confirmar aceptación"
          className="space-y-4 rounded-2xl border-2 border-teal-700 p-5"
        >
          <p>
            Si aceptas participar con {accepting.other.fullName}, deberán ser
            asignados juntos. El vínculo no podrá cancelarse unilateralmente.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              type="button"
              className={button}
              onClick={() => setAccepting(null)}
            >
              Volver
            </button>
            <button
              disabled={busy}
              type="button"
              className={primary}
              onClick={() =>
                void mutate({ action: "accept", requestId: accepting.id })
              }
            >
              Confirmar aceptación
            </button>
          </div>
        </section>
      )}
      {view && (
        <section aria-label="Tus solicitudes" className="space-y-4">
          <h2 className="text-xl font-bold">Tus solicitudes</h2>
          {!view.requests.length && (
            <p>Aún no tienes solicitudes en esta campaña.</p>
          )}
          {view.requests.map((request) => (
            <article
              key={request.id}
              className={`space-y-3 rounded-2xl border bg-white p-5 ${request.status === "pending" && request.direction === "received" ? "border-2 border-teal-700" : "border-slate-200"}`}
            >
              <h3 className="text-lg font-bold">{request.other.fullName}</h3>
              <p className="text-sm text-slate-600">
                {request.other.congregation}
              </p>
              <p className="font-semibold">{statusLabels[request.status]}</p>
              {request.status === "pending" && (
                <p>
                  {request.direction === "received"
                    ? `${request.other.fullName} desea participar contigo en esta campaña.`
                    : `Tu solicitud para participar junto a ${request.other.fullName} está pendiente de confirmación.`}
                </p>
              )}
              {request.status === "accepted" && (
                <p>
                  Cuando ambos sean asignados, deberán ser asignados juntos. Si
                  necesitan deshacer el vínculo, contacten a la organización.
                </p>
              )}
              {(request.status === "pending" ||
                request.status === "accepted") && (
                <>
                  {request.participationConflict && (
                    <p className="rounded-xl bg-amber-50 p-3">
                      Conflicto de participación: una inscripción o perfil dejó
                      de estar activo. Contacten a la organización.
                    </p>
                  )}
                  {request.availabilityConflict ? (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                      Conflicto de horarios: Actualmente no tienen horarios
                      disponibles en común. Revisen su disponibilidad.
                    </p>
                  ) : (
                    <div>
                      <p className="font-semibold">
                        {request.sharedBlocks.length}{" "}
                        {request.sharedBlocks.length === 1
                          ? "horario compartido"
                          : "horarios compartidos"}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {request.sharedBlocks.map((block) => (
                          <li key={block.id}>
                            {fullDate(block.date)} · {block.startTime}–
                            {block.endTime}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link
                    prefetch={false}
                    href={`/campanas/disponibilidad/${campaignId}`}
                    className="inline-flex min-h-12 items-center text-teal-800 underline"
                  >
                    Revisar mi disponibilidad
                  </Link>
                </>
              )}
              {view.editable && request.status === "pending" && (
                <div className="flex flex-wrap gap-3">
                  {request.direction === "received" ? (
                    <>
                      <button
                        disabled={busy}
                        type="button"
                        className={primary}
                        onClick={() => {
                          setAccepting(request);
                          setCandidate(null);
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        disabled={busy}
                        type="button"
                        className={button}
                        onClick={() =>
                          void mutate({
                            action: "reject",
                            requestId: request.id,
                          })
                        }
                      >
                        Rechazar
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy}
                      type="button"
                      className={button}
                      onClick={() =>
                        void mutate({ action: "cancel", requestId: request.id })
                      }
                    >
                      Cancelar solicitud
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
