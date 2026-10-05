"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  changeReasonLabels,
  changeStatusLabels,
} from "../domain/change-request";
import type { adminChanges } from "../server/change-request-admin";
import type { ProgramView } from "../domain/program";

type View = Awaited<ReturnType<typeof adminChanges>>;
const button =
  "min-h-12 rounded-xl border border-teal-800 px-4 py-3 font-semibold text-teal-900 disabled:opacity-50";
const field = "min-h-12 rounded-lg border p-2";
export function ChangeRequestsLink({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || document.visibilityState !== "visible") return;
      try {
        const response = await fetch(
          `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/change-requests`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
          },
        );
        const data = await response.json();
        if (active) setCount(response.ok ? data.pendingCount : null);
      } catch {
        /* Link remains usable. */
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, campaignId]);
  return (
    <Link className={button} href={`/campanas/admin/cambios/${campaignId}`}>
      Solicitudes de cambio{count !== null ? ` · ${count} pendientes` : ""}
    </Link>
  );
}
export function CampaignChanges({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [view, setView] = useState<View | null>(null),
    [detail, setDetail] = useState<View | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    status: "open",
    day: "",
    block: "",
    congregation: "",
    name: "",
  });
  const [replacement, setReplacement] = useState(""),
    [release, setRelease] = useState(false),
    [unit, setUnit] = useState(false),
    [stale, setStale] = useState(false);
  const [overrides, setOverrides] = useState<string[]>([]),
    [responseText, setResponseText] = useState("");
  const [preview, setPreview] = useState<ProgramView | null>(null),
    [warnings, setWarnings] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const base = `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/change-requests`;
  const consult = useCallback(
    async (suffix = "", body?: unknown): Promise<any> => {
      if (!user)
        throw new Error("Ingresa con una cuenta administrativa autorizada.");
      const result = await fetch(`${base}${suffix}`, {
        cache: "no-store",
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken(true)}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      return data;
    },
    [user, base],
  );
  const refresh = useCallback(async () => {
    try {
      setView(await consult());
      setError("");
    } catch (e) {
      setView(null);
      setError(e instanceof Error ? e.message : "No se pudo consultar.");
    }
  }, [consult]);
  useEffect(() => {
    void refresh();
    const update = () => {
      if (!detail && document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 12000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh, detail]);
  const selected = detail?.requests[0];
  const invalidate = () => {
    setPreview(null);
    setWarnings(false);
    setConfirmed(false);
  };
  async function open(id: string) {
    setBusy(true);
    invalidate();
    setReplacement("");
    setRelease(false);
    setUnit(false);
    setStale(false);
    setOverrides([]);
    setResponseText("");
    try {
      setDetail(await consult(`/${id}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir.");
    } finally {
      setBusy(false);
    }
  }
  const payload = () => ({
    expectedProgramVersion: detail!.expectedProgramVersion,
    currentProgramVersionId: detail!.currentProgramVersionId,
    expectedRevision: detail!.expectedRevision,
    ...(replacement ? { replacementRegistrationId: replacement } : {}),
    releaseWithoutReplacement: release,
    confirmWarnings: warnings,
    confirmUnit: unit,
    confirmStale: stale,
    maxTurnsOverrides: overrides,
    organizerResponse: responseText,
  });
  async function action(name: "approve" | "reject" | "preview" | "resolve") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const data = await consult(
        `/${selected.id}/${name}`,
        name === "approve" || name === "reject"
          ? { organizerResponse: responseText }
          : payload(),
      );
      if (name === "preview") {
        setPreview(data.view);
        setWarnings(false);
        setConfirmed(false);
      } else {
        setDetail(null);
        invalidate();
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const visible =
    view?.requests.filter(
      (r) =>
        (filters.status === "all" || filters.status === "open"
          ? filters.status === "all" ||
            ["pending", "approved"].includes(r.status)
          : r.status === filters.status) &&
        (!filters.day || r.turn?.dayId === filters.day) &&
        (!filters.block || r.turn?.blockId === filters.block) &&
        (!filters.congregation || r.congregation === filters.congregation) &&
        r.participant
          .toLocaleLowerCase("es")
          .includes(filters.name.toLocaleLowerCase("es")),
    ) ?? [];
  const options = (key: "dayId" | "blockId") => [
    ...new Map(
      view?.requests
        .filter((r) => r.turn)
        .map((r) => [
          r.turn![key],
          key === "dayId"
            ? r.turn!.date
            : `${r.turn!.date} ${r.turn!.startTime}–${r.turn!.endTime}`,
        ]),
    ).entries(),
  ];
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5">
      <Link
        href={`/campanas/admin/programa/${campaignId}`}
        className="text-teal-800 underline"
      >
        ← Programa general
      </Link>
      <h1 className="text-2xl font-bold">Solicitudes de cambio</h1>
      {view && (
        <p>
          {view.campaign.name} · Versión actual: v{view.expectedProgramVersion}{" "}
          · {view.pendingCount} pendientes
        </p>
      )}
      <button
        className={button}
        disabled={busy}
        onClick={() => {
          setDetail(null);
          invalidate();
          void refresh();
        }}
      >
        Actualizar
      </button>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label>
          Estado
          <select
            className={field}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="open">Pendientes y aprobadas</option>
            <option value="all">Todos</option>
            {Object.entries(changeStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Día
          <select
            className={field}
            value={filters.day}
            onChange={(e) => setFilters({ ...filters, day: e.target.value })}
          >
            <option value="">Todos</option>
            {options("dayId").map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bloque
          <select
            className={field}
            value={filters.block}
            onChange={(e) => setFilters({ ...filters, block: e.target.value })}
          >
            <option value="">Todos</option>
            {options("blockId").map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Congregación
          <select
            className={field}
            value={filters.congregation}
            onChange={(e) =>
              setFilters({ ...filters, congregation: e.target.value })
            }
          >
            <option value="">Todas</option>
            {[...new Set(view?.requests.map((r) => r.congregation))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
        <label>
          Nombre
          <input
            className={field}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
        </label>
      </div>
      {!visible.length && view && <p>No hay solicitudes para estos filtros.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((r) => (
          <article className="space-y-2 rounded-xl border p-4" key={r.id}>
            <h2 className="font-bold">{r.participant}</h2>
            <p>{r.congregation}</p>
            <p>
              {r.turn?.date} · {r.turn?.startTime}–{r.turn?.endTime} ·{" "}
              {r.turn?.pointName}
            </p>
            <p>Compañero: {r.turn?.companion}</p>
            <p>
              {changeReasonLabels[r.reasonCode]} ·{" "}
              {changeStatusLabels[r.status]} · v{r.sourceProgramVersion}
            </p>
            {r.comment && <p>{r.comment}</p>}
            <p>{new Date(r.createdAt).toLocaleString("es-CL")}</p>
            <button
              className={button}
              disabled={busy}
              onClick={() => void open(r.id)}
            >
              Revisar solicitud
            </button>
          </article>
        ))}
      </div>
      {selected && detail && (
        <section
          className="space-y-4 rounded-xl border-2 border-teal-800 p-5"
          aria-label="Detalle de solicitud"
        >
          <h2 className="text-xl font-bold">
            {selected.participant} · {changeStatusLabels[selected.status]}
          </h2>
          <p>
            {selected.turn?.date} · {selected.turn?.startTime}–
            {selected.turn?.endTime} · {selected.turn?.pointName} · Compañero:{" "}
            {selected.turn?.companion}
          </p>
          <p>
            Capacidad objetivo del bloque: {selected.capacity ?? "Por definir"}
          </p>
          {selected.organizerResponse && (
            <p>Respuesta anterior: {selected.organizerResponse}</p>
          )}
          {selected.stale && (
            <p role="alert" className="font-semibold text-amber-900">
              Esta solicitud corresponde a una versión anterior del programa.
              Revisa la asignación actual antes de resolver.
            </p>
          )}
          {selected.currentTurn ? (
            <p className="font-semibold">
              Turno vigente v{detail.expectedProgramVersion}:{" "}
              {selected.currentTurn.date} · {selected.currentTurn.startTime}–
              {selected.currentTurn.endTime} · {selected.currentTurn.pointName}{" "}
              · Compañero: {selected.currentTurn.companion}
            </p>
          ) : (
            <p className="font-semibold text-amber-900">
              La asignación original ya no está en el programa actual. Esta
              solicitud requiere revisión manual y no puede aplicarse sobre otro
              turno.
            </p>
          )}
          {["pending", "approved"].includes(selected.status) && (
            <label className="block">
              Respuesta breve opcional
              <textarea
                className="block w-full rounded-lg border p-3"
                maxLength={500}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </label>
          )}
          {selected.status === "pending" && (
            <div className="space-y-3">
              <p>
                Aprobar acepta gestionar la solicitud. No cambia el programa ni
                selecciona reserva.
              </p>
              <div className="flex gap-3">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void action("approve")}
                >
                  Aprobar
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void action("reject")}
                >
                  Rechazar solicitud
                </button>
              </div>
            </div>
          )}
          {selected.status === "approved" && selected.currentTurn && (
            <>
              {selected.acceptedUnit && (
                <p className="font-bold">
                  Vínculo obligatorio: el cambio retira ambos miembros del mismo
                  turno. No se cancela el vínculo.
                </p>
              )}
              <label className="block">
                Reserva disponible — orden alfabético
                <select
                  className={`${field} block w-full`}
                  value={replacement}
                  onChange={(e) => {
                    setReplacement(e.target.value);
                    setRelease(false);
                    setOverrides([]);
                    invalidate();
                  }}
                >
                  <option value="">Selecciona manualmente una reserva</option>
                  {selected.reserves.map((r) => (
                    <option key={r.registrationId} value={r.registrationId}>
                      {r.fullName} · {r.congregation} · {r.assignedTurns}/
                      {r.maxTurns ?? "sin límite"}
                      {r.accepted
                        ? ` · unidad con ${r.accepted.otherName}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!selected.reserves.length && (
                <p>No hay reservas disponibles para este bloque.</p>
              )}
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={release}
                  onChange={(e) => {
                    setRelease(e.target.checked);
                    setReplacement("");
                    invalidate();
                  }}
                />
                Confirmo liberar el turno sin reemplazo. La nueva versión
                mostrará Pendiente.
              </label>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={unit}
                  onChange={(e) => {
                    setUnit(e.target.checked);
                    invalidate();
                  }}
                />
                Confirmo gestionar los vínculos obligatorios como unidad, cuando
                correspondan.
              </label>
              {selected.stale && (
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={stale}
                    onChange={(e) => {
                      setStale(e.target.checked);
                      invalidate();
                    }}
                  />
                  Revisé la asignación vigente y autorizo resolver sobre v
                  {detail.expectedProgramVersion}.
                </label>
              )}
              {selected.reserves
                .filter(
                  (r) =>
                    r.registrationId === replacement ||
                    selected.reserves.find(
                      (p) => p.registrationId === replacement,
                    )?.accepted?.otherRegistrationId === r.registrationId,
                )
                .map((r) =>
                  r.maxTurns !== null && r.assignedTurns + 1 > r.maxTurns ? (
                    <label key={r.registrationId} className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={overrides.includes(r.registrationId)}
                        onChange={(e) => {
                          setOverrides(
                            e.target.checked
                              ? [...overrides, r.registrationId]
                              : overrides.filter(
                                  (id) => id !== r.registrationId,
                                ),
                          );
                          invalidate();
                        }}
                      />
                      Autorizo superar el máximo de turnos de {r.fullName} (
                      {r.assignedTurns + 1}/{r.maxTurns}).
                    </label>
                  ) : null,
                )}
              <button
                className={button}
                disabled={busy || (!replacement && !release)}
                onClick={() => void action("preview")}
              >
                Revisar resolución y advertencias
              </button>
              {preview && (
                <div className="space-y-3 rounded-xl bg-amber-50 p-4">
                  <h3 className="font-bold">
                    Validación para v{detail.expectedProgramVersion + 1}
                  </h3>
                  {preview.blockingErrors.map((i, n) => (
                    <p key={n} role="alert">
                      {i.message} {i.person} {i.hours} {i.point}
                    </p>
                  ))}
                  <p>{preview.warnings.length} advertencias</p>
                  {preview.warnings.map((i, n) => (
                    <p key={n}>
                      {i.message} {i.date} {i.hours} {i.point} {i.person}
                    </p>
                  ))}
                  {!!preview.warnings.length && (
                    <label className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={warnings}
                        onChange={(e) => setWarnings(e.target.checked)}
                      />
                      He revisado y confirmo todas las advertencias.
                    </label>
                  )}
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Confirmo aplicar este cambio manual y crear v
                    {detail.expectedProgramVersion + 1}. Las versiones
                    anteriores no se modificarán.
                  </label>
                  <button
                    className={button}
                    disabled={
                      busy ||
                      !!preview.blockingErrors.length ||
                      (!!preview.warnings.length && !warnings) ||
                      !confirmed
                    }
                    onClick={() => void action("resolve")}
                  >
                    Resolver y publicar nueva versión
                  </button>
                </div>
              )}
            </>
          )}
          <button
            className={button}
            disabled={busy}
            onClick={() => {
              setDetail(null);
              invalidate();
            }}
          >
            Cerrar detalle
          </button>
        </section>
      )}
    </main>
  );
}
