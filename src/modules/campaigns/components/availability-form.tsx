"use client";
import { campaignFetch } from "../lib/campaign-fetch";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  Coverage,
  MaxTurns,
  RegistrationView,
} from "../domain/registration";
import { saveRegistrationSchema } from "../schemas/registration-schemas";

function coverageText(coverage: Coverage) {
  if (coverage.capacity === null) return "Capacidad por definir";
  if (coverage.isFull)
    return coverage.reservePotential
      ? `Cobertura completa · ${coverage.reservePotential} ${coverage.reservePotential === 1 ? "reserva potencial" : "reservas potenciales"}`
      : "Cobertura completa";
  return coverage.needsSupport ? "Necesitamos apoyo" : "Aún hay cupos";
}
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
const selectClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-700";

export function AvailabilityForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [view, setView] = useState<RegistrationView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [congregationId, setCongregationId] = useState("");
  const [maxTurns, setMaxTurns] = useState<MaxTurns>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    const reply = await campaignFetch(
      `/api/campanas/participant/campaigns/${campaignId}`,
      { cache: "no-store" },
    );
    if (reply.status === 401) {
      router.replace("/campanas/ingresar");
      router.refresh();
    }
    const result = await reply.json();
    if (!reply.ok) throw new Error(result.error);
    return result as RegistrationView;
  }, [campaignId, router]);
  const apply = useCallback((next: RegistrationView) => {
    setView(next);
    setCongregationId(next.congregationId ?? "");
    setMaxTurns(
      next.campaign.registration ? next.campaign.registration.maxTurns : 1,
    );
    setSelected(
      new Set(
        next.days.flatMap((day) =>
          day.blocks.filter((block) => block.selected).map((block) => block.id),
        ),
      ),
    );
  }, []);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError("");
    load()
      .then((next) => {
        if (!disposed) apply(next);
      })
      .catch((failure: Error) => {
        if (!disposed) setError(failure.message);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [load, apply]);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      apply(await load());
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos conectar.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    const input = { congregationId, maxTurns, timeBlockIds: [...selected] };
    if (!saveRegistrationSchema.safeParse(input).success) {
      setError("Selecciona tu congregación y revisa los horarios.");
      return;
    }
    setSaving(true);
    try {
      const reply = await campaignFetch(
        `/api/campanas/participant/campaigns/${campaignId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store",
        },
      );
      if (reply.status === 401) {
        router.replace("/campanas/ingresar");
        router.refresh();
      }
      const result = await reply.json();
      if (!reply.ok) throw new Error(result.error);
      setSaved(true);
      try {
        apply(await load());
      } catch {
        setError(
          "Tu disponibilidad se guardó, pero no pudimos actualizar la cobertura. Puedes recargar para verla.",
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos conectar. Tu cambio no fue guardado.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <p role="status">Cargando horarios…</p>;
  if (!view)
    return (
      <div role="alert">
        <p>{error}</p>
        <button
          onClick={() => void reload()}
          className="mt-3 min-h-12 rounded-xl border border-slate-300 px-4"
        >
          Intentar nuevamente
        </button>
      </div>
    );
  const editable =
    view.campaign.status === "registration_open" &&
    (!view.campaign.registration ||
      view.campaign.registration.registrationStatus === "active");
  const noBlocks = !view.days.some((day) => day.blocks.length);
  return (
    <form onSubmit={save} className="space-y-6" aria-busy={saving}>
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">{view.campaign.name}</h1>
        {view.campaign.registration && (
          <Link
            prefetch={false}
            href={`/campanas/participar-juntos/${campaignId}`}
            className="inline-flex min-h-12 items-center text-teal-800 underline"
          >
            Participar con otro hermano
          </Link>
        )}
        {view.campaign.description && (
          <p className="leading-7">{view.campaign.description}</p>
        )}
        {view.campaign.locationName && <p>{view.campaign.locationName}</p>}
        {view.campaign.locationDetails && (
          <p className="text-slate-600">{view.campaign.locationDetails}</p>
        )}
        <p className="rounded-xl bg-teal-50 p-4 leading-7">
          Marcar disponibilidad no confirma un turno. Puedes ofrecer apoyo
          incluso cuando un horario esté completo.
        </p>
        {!editable && (
          <p
            role="status"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4"
          >
            {view.campaign.registration &&
            view.campaign.registration.registrationStatus !== "active"
              ? "Tu inscripción no está activa. Contacta a la organización."
              : "Las inscripciones están cerradas. Puedes revisar tu disponibilidad, pero no modificarla."}
          </p>
        )}
      </header>
      <fieldset disabled={!editable || saving} className="space-y-6">
        <label className="block text-lg font-semibold">
          Congregación
          <select
            value={congregationId}
            onChange={(event) => {
              setCongregationId(event.target.value);
              setSaved(false);
            }}
            required
            className={selectClass}
          >
            <option value="">Selecciona tu congregación</option>
            {view.congregations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {!view.congregations.length && (
          <p>
            No hay congregaciones activas asociadas. Contacta a la organización.
          </p>
        )}
        <label className="block text-lg font-semibold">
          ¿Cuántos turnos como máximo deseas realizar?
          <select
            value={maxTurns === null ? "unlimited" : String(maxTurns)}
            onChange={(event) => {
              setMaxTurns(
                event.target.value === "unlimited"
                  ? null
                  : (Number(event.target.value) as MaxTurns),
              );
              setSaved(false);
            }}
            className={selectClass}
          >
            <option value="1">1 turno</option>
            <option value="2">2 turnos</option>
            <option value="3">3 turnos</option>
            <option value="unlimited">Sin límite</option>
          </select>
        </label>
        {noBlocks && (
          <p className="rounded-xl border border-slate-200 bg-white p-5">
            Los horarios todavía no están disponibles.
          </p>
        )}
        {view.days
          .filter((day) => day.blocks.length)
          .map((day) => (
            <section
              key={day.id}
              className="space-y-4"
              aria-label={dateLabel(day.date)}
            >
              <h2 className="text-xl font-bold capitalize">
                {dateLabel(day.date)}
              </h2>
              {day.label && <p className="text-slate-600">{day.label}</p>}
              {day.blocks.map((block) => (
                <article
                  key={block.id}
                  className={`space-y-3 rounded-2xl border bg-white p-5 ${block.coverage.needsSupport ? "border-amber-400" : "border-slate-200"}`}
                >
                  <h3 className="text-xl font-bold">
                    {block.startTime}–{block.endTime}
                  </h3>
                  {block.label && <p>{block.label}</p>}
                  <p className="font-semibold">
                    {coverageText(block.coverage)}
                  </p>
                  <p>
                    {block.coverage.availableCount}{" "}
                    {block.coverage.availableCount === 1
                      ? "persona disponible"
                      : "personas disponibles"}{" "}
                    · Capacidad objetivo:{" "}
                    {block.coverage.capacity ?? "Por definir"}
                  </p>
                  {block.coverage.remainingCapacity !== null &&
                    !block.coverage.isFull && (
                      <p>
                        Faltan {block.coverage.remainingCapacity} personas para
                        cubrir este horario.
                      </p>
                    )}
                  {block.coverage.isFull && (
                    <p className="leading-7">
                      {editable
                        ? "Este horario ya tiene la cobertura principal completa. Si marcas disponibilidad, podrás quedar como reserva."
                        : "Este horario tiene la cobertura principal completa. La disponibilidad adicional se considera reserva potencial."}
                    </p>
                  )}
                  <label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl bg-slate-50 p-3 text-lg font-semibold">
                    <input
                      type="checkbox"
                      className="h-7 w-7 accent-teal-700 focus-visible:outline-2 focus-visible:outline-teal-700"
                      checked={selected.has(block.id)}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(block.id);
                        else next.delete(block.id);
                        setSelected(next);
                        setSaved(false);
                      }}
                      aria-label={`Estoy disponible: ${dateLabel(day.date)}, ${block.startTime} a ${block.endTime}`}
                    />
                    <span>
                      {selected.has(block.id)
                        ? "Marcaste disponibilidad"
                        : "Estoy disponible"}
                    </span>
                  </label>
                </article>
              ))}
            </section>
          ))}
      </fieldset>
      {view.unavailableSelectionCount > 0 && (
        <p className="rounded-xl bg-slate-100 p-4">
          Hay {view.unavailableSelectionCount} horarios que marcaste y ya no
          están disponibles. Conservamos ese registro; no se borrará al guardar.
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="rounded-xl bg-green-100 p-4 font-semibold text-green-900"
        >
          Tu disponibilidad fue guardada correctamente.
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={saving}
            className="min-h-12 rounded-xl border border-slate-300 px-4"
          >
            Recargar horarios
          </button>
        </div>
      )}
      {editable && (
        <button
          disabled={saving || !view.congregations.length}
          className="min-h-14 w-full rounded-xl bg-teal-700 px-4 text-lg font-semibold text-white disabled:opacity-50"
        >
          {saving
            ? "Guardando…"
            : view.campaign.registration
              ? "Guardar cambios"
              : "Guardar disponibilidad"}
        </button>
      )}
    </form>
  );
}
