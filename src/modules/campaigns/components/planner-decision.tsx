"use client";
import { useState } from "react";
import type {
  PlannerAssignment,
  PlannerPerson,
  PlannerView,
  PlannerWarningDTO,
} from "../domain/planner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { plannerButton } from "./planner-points";
export interface PlannerDecision {
  action: "create" | "move" | "cancel";
  pointId: string;
  slotNumber: 1 | 2 | 3;
  person: PlannerPerson;
  assignment?: PlannerAssignment;
}
export function PlannerDecisionDialog({
  decision,
  view,
  saving,
  warnings,
  error,
  close,
  submit,
}: {
  decision: PlannerDecision;
  view: PlannerView;
  saving: boolean;
  warnings: PlannerWarningDTO[];
  error: string;
  close: () => void;
  submit: (
    pointId: string,
    slotNumber: 1 | 2 | 3,
    overrides: {
      registrationId: string;
      availability: boolean;
      maxTurns: boolean;
      capacity: boolean;
    }[],
    adultSupportRegistrationId?: string,
  ) => void;
}) {
  const [pointId, setPoint] = useState(decision.pointId),
    [slotNumber, setSlot] = useState(decision.slotNumber),
    [confirmed, setConfirmed] = useState<string[]>([]),
    [adultSupportRegistrationId, setAdultSupportRegistrationId] = useState("");
  const label =
    decision.action === "cancel"
      ? "Liberar"
      : decision.action === "move"
        ? "Mover"
        : "Asignar";
  const unitLabel = decision.person.accepted
    ? `${decision.person.fullName} y ${decision.person.accepted.otherName}`
    : decision.person.fullName;
  const ids = [...new Set(warnings.map((warning) => warning.registrationId))];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {label}{" "}
            {decision.person.accepted ? "vínculo obligatorio" : "participante"}
          </DialogTitle>
          <DialogDescription>
            Decisión manual del organizador. Se guardará al recibir confirmación
            del servidor.
          </DialogDescription>
        </DialogHeader>
        <p className="font-medium">{unitLabel}</p>
        {decision.action === "create" && decision.person.isMinor && (
          <div className="space-y-2 rounded bg-amber-50 p-3 text-sm">
            <p>Menor de edad · responsable: {decision.person.guardianName ?? "no disponible"}</p>
            <label className="block">Hermana adulta que acompañará al menor
              <select className="mt-1 w-full rounded border p-2" value={adultSupportRegistrationId} onChange={(e) => setAdultSupportRegistrationId(e.target.value)}>
                <option value="">Selecciona una hermana adulta</option>
                {[...view.available, ...view.exceptions].filter((person) => !person.isMinor && person.registrationId !== decision.person.guardianRegistrationId && person.registrationId !== decision.person.registrationId).map((person) => <option key={person.registrationId} value={person.registrationId}>{person.fullName}</option>)}
              </select>
            </label>
          </div>
        )}
        {decision.person.accepted && (
          <p className="text-sm text-teal-900">
            El vínculo obligatorio se{" "}
            {decision.action === "cancel"
              ? "libera"
              : decision.action === "move"
                ? "mueve"
                : "asigna"}{" "}
            completo: mismo punto y bloque, slots distintos. No se crea otro
            vínculo.
          </p>
        )}
        {decision.action === "move" ? (
          <>
            <label className="block">
              Punto de destino
              <select
                className="mt-1 w-full rounded border p-2"
                value={pointId}
                disabled={saving}
                onChange={(e) => {
                  setPoint(e.target.value);
                  setConfirmed([]);
                }}
              >
                {view.points
                  .filter((point) => point.active && point.globalActive)
                  .map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              Slot de {decision.person.fullName}
              <select
                className="mt-1 w-full rounded border p-2"
                value={slotNumber}
                disabled={saving}
                onChange={(e) => {
                  setSlot(Number(e.target.value) as 1 | 2 | 3);
                  setConfirmed([]);
                }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                {view.canAssignSupport && <option value={3}>3 · Apoyo adicional</option>}
              </select>
            </label>
            <p className="text-sm">
              Para otro bloque: libera primero y asigna de nuevo en el bloque
              elegido.
            </p>
          </>
        ) : decision.action === "create" ? (
          <p>
            {view.points.find((point) => point.id === pointId)?.name} · {slotNumber === 3 ? "Apoyo adicional" : `Lugar ${slotNumber}`} · {view.block?.date} {view.block?.startTime}
          </p>
        ) : (
          <p>
            Volverá a Disponibles si tiene disponibilidad en este bloque. No se
            modifica su Availability.
          </p>
        )}
        {warnings.map((warning) => {
          const key = warning.registrationId + ":" + warning.kind;
          return (
            <label
              key={key}
              className="block rounded border border-amber-500 bg-amber-50 p-3"
            >
              <input
                type="checkbox"
                checked={confirmed.includes(key)}
                disabled={saving}
                onChange={(e) =>
                  setConfirmed((current) =>
                    e.target.checked
                      ? [...current, key]
                      : current.filter((value) => value !== key),
                  )
                }
              />{" "}
              <strong>{warning.fullName}:</strong> {warning.message} Confirmo
              esta excepción y su auditoría.
            </label>
          );
        })}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className={plannerButton} disabled={saving} onClick={close}>
            Cancelar
          </button>
          <button
            className={plannerButton}
            disabled={
              saving ||
              warnings.some(
                (warning) =>
                  !confirmed.includes(
                    warning.registrationId + ":" + warning.kind,
                  ),
              )
            }
            onClick={() =>
              submit(
                pointId,
                slotNumber,
                ids.map((registrationId) => ({
                  registrationId,
                  availability: confirmed.includes(
                    registrationId + ":availability",
                  ),
                  maxTurns: confirmed.includes(registrationId + ":maxTurns"),
                  capacity: confirmed.includes(registrationId + ":capacity"),
                })),
                adultSupportRegistrationId || undefined,
              )
            }
          >
            {saving ? "Guardando…" : `Confirmar ${label.toLowerCase()}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
