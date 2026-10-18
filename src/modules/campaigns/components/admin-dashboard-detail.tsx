"use client";

import { useEffect, useState, useMemo } from "react";
import { registrationStatusLabel, pairStatusLabels } from "../lib/presentation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  AdminParticipantDetail,
  AdminOverview,
} from "../domain/admin-dashboard";
import { formatHumanDate } from "./campaign-schedule-settings";
import { useAuth } from "@/hooks/use-auth";
import { campaignFetch } from "../lib/campaign-fetch";

import type { AdminParticipantList } from "../domain/admin-dashboard";

export function DashboardDetail({
  open,
  detail,
  overview,
  campaignId,
  loading,
  error,
  onClose,
  onSaved,
}: {
  open: boolean;
  detail: AdminParticipantDetail | null;
  overview: AdminOverview | null;
  campaignId: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();

  // Initial state tracking
  const [initialSelectedBlocks, setInitialSelectedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [initialMaxTurns, setInitialMaxTurns] = useState<number | null>(null);
  const [maxTurns, setMaxTurns] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [editedName, setEditedName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Sync state when detail opens or changes
  useEffect(() => {
    if (detail) {
      const activeIds = new Set(
        detail.availability.filter((a) => a.active).map((a) => a.blockId),
      );
      setInitialSelectedBlocks(activeIds);
      setSelectedBlocks(activeIds);
      setInitialMaxTurns(detail.maxTurns ?? null);
      setMaxTurns(detail.maxTurns ?? null);
      setReason("");
      setEditedName(detail.fullName);
      setNameMessage("");
      setNameError("");
      setSaveError("");
      setSaveSuccess("");
    } else {
      setInitialSelectedBlocks(new Set());
      setSelectedBlocks(new Set());
      setInitialMaxTurns(null);
      setMaxTurns(null);
      setReason("");
      setSaveError("");
      setSaveSuccess("");
    }
  }, [detail]);

  // Set of blocks with published assignments that cannot be removed
  const publishedAssignmentBlockIds = useMemo(() => {
    return new Set(detail?.publishedAssignmentBlockIds ?? []);
  }, [detail?.publishedAssignmentBlockIds]);

  // Calculate changes
  const hasAvailabilityChanges = useMemo(() => {
    if (!detail) return false;
    if (selectedBlocks.size !== initialSelectedBlocks.size) return true;
    for (const id of selectedBlocks) {
      if (!initialSelectedBlocks.has(id)) return true;
    }
    return false;
  }, [detail, selectedBlocks, initialSelectedBlocks]);

  const hasMaxTurnsChange = maxTurns !== initialMaxTurns;
  const hasChanges = hasAvailabilityChanges || hasMaxTurnsChange;

  const toggleBlock = (blockId: string) => {
    setSaveError("");
    setSaveSuccess("");
    const isCurrentlySelected = selectedBlocks.has(blockId);

    // If trying to uncheck a block with a published assignment, block and warn
    if (isCurrentlySelected && publishedAssignmentBlockIds.has(blockId)) {
      setSaveError(
        "Este hermano ya está asignado en este horario a través de un programa publicado. No se puede quitar su disponibilidad directamente.",
      );
      return;
    }

    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleCancelChanges = () => {
    setSelectedBlocks(new Set(initialSelectedBlocks));
    setMaxTurns(initialMaxTurns);
    setReason("");
    setSaveError("");
    setSaveSuccess("");
  };

  const saveName = async () => {
    if (!detail || !user || !editedName.trim()) return;
    setNameSaving(true);
    setNameError("");
    setNameMessage("");
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(detail.registrationId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editedName }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar el nombre.");
      setEditedName(body.fullName);
      setNameMessage("Nombre actualizado.");
      onSaved();
    } catch (failure) {
      setNameError(failure instanceof Error ? failure.message : "No se pudo guardar el nombre.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleSave = async () => {
    if (!detail || !user || !hasChanges) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token = await user.getIdToken(true);

      // Determine block changes
      const allKnownBlocks = overview?.days.flatMap((d) => d.blocks) ?? [];
      const allKnownBlockIds = new Set(allKnownBlocks.map((b) => b.id));
      for (const a of detail.availability) {
        allKnownBlockIds.add(a.blockId);
      }

      const blockChanges: { blockId: string; available: boolean }[] = [];
      for (const blockId of allKnownBlockIds) {
        const wasSelected = initialSelectedBlocks.has(blockId);
        const isSelected = selectedBlocks.has(blockId);
        if (wasSelected !== isSelected) {
          blockChanges.push({ blockId, available: isSelected });
        }
      }

      const payload = {
        blockChanges,
        ...(hasMaxTurnsChange ? { maxTurns } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };

      const res = await campaignFetch(
        `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(detail.registrationId)}/availability`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "No se pudieron guardar los cambios.");
      }

      setSaveSuccess("Disponibilidad actualizada exitosamente.");
      setInitialSelectedBlocks(new Set(selectedBlocks));
      setInitialMaxTurns(maxTurns);
      setReason("");
      onSaved();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Error al guardar cambios.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <SheetHeader className="text-left pb-4 border-b border-slate-100">
          <SheetTitle className="text-xl font-bold text-slate-900">
            {detail?.fullName ?? "Ficha del participante"}
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            Consulta y administración operativa de disponibilidad.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="py-8 text-center text-sm text-slate-500">
            Cargando información del participante…
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {detail && (
          <div className="space-y-6 pt-4">
            {/* 1. Datos personales */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datos personales
              </h3>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <span className="block text-xs text-slate-500">Nombre</span>
                  <label htmlFor="participant-full-name" className="sr-only">Nombre del participante</label>
                  <input id="participant-full-name" className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 font-semibold text-slate-900" value={editedName} onChange={(event) => setEditedName(event.target.value)} />
                </div>
                <div>
                  <span className="block text-xs text-slate-500">
                    Congregación
                  </span>
                  <span className="font-semibold text-slate-900">
                    {detail.congregation}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Teléfono</span>
                  <span className="font-semibold text-slate-900">
                    {detail.phone ?? "No disponible"}
                  </span>
                  <span className="block text-[11px] text-slate-500">No editable</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">
                    Estado perfil
                  </span>
                  <span
                    className={`font-semibold ${
                      detail.profileActive ? "text-teal-800" : "text-amber-800"
                    }`}
                  >
                    {detail.profileActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void saveName()} disabled={nameSaving || !editedName.trim() || editedName.trim() === detail.fullName} className="inline-flex min-h-9 items-center rounded-lg bg-teal-800 px-4 text-xs font-semibold text-white disabled:opacity-50">{nameSaving ? "Guardando…" : "Guardar nombre"}</button>
                {nameMessage && <span role="status" className="text-xs text-teal-800">{nameMessage}</span>}
                {nameError && <span role="alert" className="text-xs text-red-700">{nameError}</span>}
              </div>
            </section>

            {/* 2. Participación */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Participación
              </h3>
              <div className="rounded-lg bg-slate-50 p-3 space-y-2 text-sm">
                <div>
                  <label
                    htmlFor="max-turns-select"
                    className="block text-xs text-slate-500 mb-1"
                  >
                    Máximo de turnos
                  </label>
                  <select
                    id="max-turns-select"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                    value={maxTurns === null ? "none" : String(maxTurns)}
                    onChange={(e) => {
                      setSaveError("");
                      setSaveSuccess("");
                      setMaxTurns(
                        e.target.value === "none" ? null : Number(e.target.value),
                      );
                    }}
                  >
                    <option value="none">Sin límite</option>
                    <option value="1">1 turno</option>
                    <option value="2">2 turnos</option>
                    <option value="3">3 turnos</option>
                    <option value="4">4 turnos</option>
                    <option value="5">5 turnos</option>
                    <option value="6">6 turnos</option>
                  </select>
                </div>
                {detail.createdAt && (
                  <p className="text-xs text-slate-500 pt-1">
                    Inscrito:{" "}
                    {new Date(detail.createdAt).toLocaleDateString("es-CL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </section>

            {/* 3. Disponibilidad (Edición administrativa) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Disponibilidad
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marca o desmarca los horarios disponibles.
                  </p>
                </div>
                {hasChanges && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Cambios sin guardar
                  </span>
                )}
              </div>

              {saveError && (
                <p
                  role="alert"
                  className="rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-800"
                >
                  {saveError}
                </p>
              )}

              {saveSuccess && (
                <p
                  role="status"
                  className="rounded border border-teal-300 bg-teal-50 p-2.5 text-xs text-teal-800"
                >
                  {saveSuccess}
                </p>
              )}

              {overview?.days && overview.days.length > 0 ? (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-3">
                  {overview.days.map((day) => (
                    <div key={day.id} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1">
                        {formatHumanDate(day.date)} {day.label ? `· ${day.label}` : ""}
                      </h4>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {day.blocks.map((block) => {
                          const isChecked = selectedBlocks.has(block.id);
                          const isProtected = publishedAssignmentBlockIds.has(block.id);

                          return (
                            <div key={block.id} className={`rounded border p-2 text-xs transition-colors ${
                                isChecked
                                  ? "border-teal-200 bg-teal-50/50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}>
                              <label className={`flex items-start gap-2.5 ${isProtected ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isProtected && isChecked}
                                  onChange={() => toggleBlock(block.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700 disabled:opacity-50"
                                />
                                <div className="flex-1">
                                <span className="font-semibold">
                                  {block.startTime}–{block.endTime}
                                </span>
                                {block.label && (
                                  <span className="text-slate-500 ml-1">
                                    ({block.label})
                                  </span>
                                )}
                                {isProtected && (
                                  <span className="block text-[11px] font-medium text-amber-800 mt-0.5">
                                    Turno publicado asignado (protegido)
                                  </span>
                                )}
                                </div>
                              </label>
                              {isChecked && <OrganizerPairRequest campaignId={campaignId} registrationId={detail.registrationId} timeBlockId={block.id} onSent={onSaved} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No hay días configurados en esta campaña.
                </p>
              )}

              {/* Optional Reason and Save Actions */}
              <div className="space-y-3 pt-2">
                <div>
                  <label
                    htmlFor="availability-change-reason"
                    className="block text-xs text-slate-600 mb-1"
                  >
                    Motivo del cambio (opcional)
                  </label>
                  <input
                    id="availability-change-reason"
                    type="text"
                    placeholder="Ej. Solicitado por el participante"
                    value={reason}
                    maxLength={200}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !hasChanges}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-teal-800 px-4 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleCancelChanges}
                      disabled={saving}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Compañero */}
            <section className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Compañero / Vínculos
              </h3>
              {!detail.pairRequests.length ? (
                <p className="text-xs text-slate-500">
                  Sin solicitudes ni vínculos de compañero.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.pairRequests.map((pair) => (
                    <li
                      key={pair.id}
                      className="rounded border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {pair.otherName}
                        </span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {pairStatusLabels[pair.status]}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        {pair.direction === "sent" ? "Solicitud enviada" : "Solicitud recibida"}
                      </p>
                      {pair.availabilityConflict && (
                        <p className="text-amber-800 font-medium">
                          Sin horarios activos en común.
                        </p>
                      )}
                      {pair.status === "pending" && <OrganizerPairAcceptance campaignId={campaignId} registrationId={detail.registrationId} requestId={pair.id} onSaved={onSaved} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OrganizerPairRequest({ campaignId, registrationId, timeBlockId, onSent }: { campaignId: string; registrationId: string; timeBlockId: string; onSent: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminParticipantList["rows"]>([]);
  const [recipientRegistrationId, setRecipientRegistrationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acceptImmediately, setAcceptImmediately] = useState(false);

  useEffect(() => {
    setRows([]); setRecipientRegistrationId(""); setBusy(false);
    if (!open || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void search(controller.signal), 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open, campaignId, registrationId]);
  async function search(signal?: AbortSignal) {
    if (!user || query.trim().length < 3) { setError("Escribe al menos tres letras para buscar."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/participants?status=active&page=1`, { signal, headers: { Authorization: `Bearer ${token}`, "X-Campaign-Search": encodeURIComponent(query.trim()) } });
      const body = await response.json();
      if (signal?.aborted) return;
      if (!response.ok) throw new Error(body.error ?? "No se pudo buscar participantes.");
      setRows((body as AdminParticipantList).rows.filter((row) => row.registrationId !== registrationId));
      setRecipientRegistrationId("");
      if (!body.rows.length) setMessage("No encontramos participantes con ese nombre en esta campaña.");
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "No se pudo buscar participantes."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }

  async function send() {
    if (!user || !recipientRegistrationId) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(registrationId)}/pair-requests`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipientRegistrationId, timeBlockId, acceptImmediately }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo enviar la solicitud.");
      setMessage(acceptImmediately ? "Compañero confirmado de inmediato." : "Solicitud enviada. La otra persona podrá aceptarla o rechazarla desde Inicio en la PWA.");
      setOpen(false);
      onSent();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo enviar la solicitud."); }
    finally { setBusy(false); }
  }

  return <div className="mt-2 border-t border-slate-200 pt-2">
    {!open ? <button type="button" onClick={() => { setOpen(true); setError(""); }} className="text-[11px] font-semibold text-teal-800 underline">Solicitar compañero</button> : <div className="space-y-2">
      <p className="text-[11px] text-slate-600">La otra persona recibirá una solicitud y podrá aceptar, agregar este horario o rechazarla.</p>
      <div className="flex gap-1.5"><input aria-label="Buscar participante por nombre" className="h-8 min-w-0 flex-1 rounded border border-slate-300 px-2 text-xs" placeholder="Nombre del compañero" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /><button type="button" disabled={busy} onClick={() => void search()} className="rounded bg-slate-200 px-2 text-xs font-medium disabled:opacity-50">Buscar</button></div>
      {rows.length > 0 && <><label className="sr-only" htmlFor={`pair-candidate-${timeBlockId}`}>Selecciona compañero</label><select id={`pair-candidate-${timeBlockId}`} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs" value={recipientRegistrationId} onChange={(event) => setRecipientRegistrationId(event.target.value)}><option value="">Selecciona una persona</option>{rows.map((row) => <option key={row.registrationId} value={row.registrationId}>{row.fullName} · {row.congregation}</option>)}</select><label className="flex items-start gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={acceptImmediately} onChange={(event) => setAcceptImmediately(event.target.checked)} className="mt-0.5" />Ya conversaron: marcar como aceptada de inmediato</label><button type="button" disabled={busy || !recipientRegistrationId} onClick={() => void send()} className="rounded bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : acceptImmediately ? "Confirmar compañero" : "Enviar solicitud"}</button></>}
      <button type="button" onClick={() => setOpen(false)} className="ml-2 text-xs text-slate-600 underline">Cancelar</button>
    </div>}
    {message && <p role="status" className="mt-1 text-[11px] text-teal-800">{message}</p>}{error && <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p>}
  </div>;
}

function OrganizerPairAcceptance({ campaignId, registrationId, requestId, onSaved }: { campaignId: string; registrationId: string; requestId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    if (!user) return;
    setBusy(true); setError("");
    try {
      const token = await user.getIdToken(true);
      const response = await campaignFetch(`/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(registrationId)}/pair-requests`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", requestId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo confirmar el compañero.");
      onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo confirmar el compañero."); }
    finally { setBusy(false); }
  }
  return <div className="pt-1"><button type="button" disabled={busy} onClick={() => void accept()} className="rounded bg-teal-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Confirmando…" : "Marcar como aceptada"}</button>{error && <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p>}</div>;
}
