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
                  <span className="font-semibold text-slate-900">
                    {detail.fullName}
                  </span>
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
                            <label
                              key={block.id}
                              className={`flex items-start gap-2.5 rounded border p-2 text-xs transition-colors ${
                                isChecked
                                  ? "border-teal-200 bg-teal-50/50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              } ${isProtected ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
                            >
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
