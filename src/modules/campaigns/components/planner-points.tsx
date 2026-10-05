"use client";
import type { PlannerAssignment, PlannerView } from "../domain/planner";
export const plannerButton =
  "rounded border border-teal-700 px-3 py-2 text-sm font-medium text-teal-900 disabled:opacity-40";
export function PlannerPoints({
  view,
  saving,
  selected,
  activate,
  assign,
  change,
  complete,
}: {
  view: PlannerView;
  saving: boolean;
  selected: string;
  activate: (pointId: string, active: boolean) => void;
  assign: (pointId: string, slotNumber: 1 | 2) => void;
  change: (assignment: PlannerAssignment, action: "move" | "cancel") => void;
  complete: (assignment: PlannerAssignment) => void;
}) {
  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border bg-white p-4"
      aria-label="Puntos y asignaciones"
    >
      <h2 className="text-xl font-bold">Puntos / Asignaciones</h2>
      <p className="text-sm text-slate-600">
        Dos slots por punto. Selecciona una persona; tú decides el punto y el
        slot.
      </p>
      {view.points.map((point) => (
        <article key={point.id} className="space-y-3 rounded border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">{point.name}</h3>
            <label className="text-sm">
              <input
                type="checkbox"
                checked={point.active}
                disabled={
                  saving ||
                  !view.mutable ||
                  (!point.globalActive && !point.active)
                }
                onChange={(e) => activate(point.id, e.target.checked)}
              />{" "}
              Activo en este bloque
            </label>
          </div>
          {!point.globalActive && (
            <p className="text-sm text-amber-800">
              Punto general inactivo o eliminado.
            </p>
          )}
          {point.slots.some(Boolean) && (
            <p className="text-xs text-slate-600">
              Para desactivar este punto, primero libera sus asignaciones.
            </p>
          )}
          {(point.active || point.slots.some(Boolean)) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {point.slots.map((assignment, index) => (
                <div key={index} className="space-y-2 rounded bg-slate-50 p-3">
                  <p className="text-sm font-semibold">Slot {index + 1}</p>
                  {assignment ? (
                    <>
                      <p className="font-medium">
                        {assignment.person.fullName}
                      </p>
                      <p className="text-sm">
                        {assignment.person.congregation}
                      </p>
                      {assignment.person.accepted && (
                        <p className="text-sm text-teal-800">
                          Vínculo obligatorio:{" "}
                          {assignment.person.accepted.otherName}
                        </p>
                      )}
                      {(assignment.availabilityOverride ||
                        assignment.maxTurnsOverride) && (
                        <p className="text-xs text-amber-800">
                          Excepción registrada:{" "}
                          {assignment.availabilityOverride
                            ? "disponibilidad "
                            : ""}
                          {assignment.maxTurnsOverride
                            ? "máximo de turnos"
                            : ""}
                        </p>
                      )}
                      {assignment.warnings.map((warning) => (
                        <p key={warning} className="text-sm text-amber-900">
                          {warning}
                        </p>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        {assignment.person.accepted &&
                          !point.slots[assignment.slotNumber === 1 ? 1 : 0] &&
                          [...view.available, ...view.exceptions].some(
                            (person) =>
                              person.registrationId ===
                              assignment.person.accepted!.otherRegistrationId,
                          ) && (
                            <button
                              className={plannerButton}
                              disabled={
                                saving ||
                                !view.mutable ||
                                !point.globalActive ||
                                !point.active
                              }
                              onClick={() => complete(assignment)}
                            >
                              Completar vínculo
                            </button>
                          )}
                        <button
                          className={plannerButton}
                          disabled={saving || !view.mutable}
                          onClick={() => change(assignment, "move")}
                        >
                          Mover
                        </button>
                        <button
                          className={plannerButton}
                          disabled={
                            saving || view.campaign.status !== "planning"
                          }
                          onClick={() => change(assignment, "cancel")}
                        >
                          Liberar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">Sin asignar</p>
                      <button
                        className={plannerButton}
                        disabled={
                          !selected ||
                          saving ||
                          !view.mutable ||
                          !point.active ||
                          !point.globalActive
                        }
                        onClick={() => assign(point.id, (index + 1) as 1 | 2)}
                      >
                        Asignar slot {index + 1}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {point.active && point.slots.filter(Boolean).length === 1 && (
            <p className="text-sm text-amber-800">
              Punto incompleto. El segundo slot queda a decisión del
              organizador.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
