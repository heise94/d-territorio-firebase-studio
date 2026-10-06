"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  AdminParticipantDetail,
  AdminAvailability,
} from "../domain/admin-dashboard";
import { LinkSummary } from "./admin-dashboard-participants";

function BlockText({ block }: { block: AdminAvailability }) {
  return (
    <>
      {block.date ?? "Fecha no disponible"} · {block.startTime ?? "—"}–
      {block.endTime ?? "—"}
      {block.label ? ` · ${block.label}` : ""}
    </>
  );
}
export function DashboardDetail({
  open,
  detail,
  loading,
  error,
  onClose,
}: {
  open: boolean;
  detail: AdminParticipantDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-white text-slate-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {detail?.fullName ?? "Ficha del participante"}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Consulta administrativa de solo lectura. Los vínculos accepted son
            obligatorios; no se asignan turnos desde esta ficha.
          </DialogDescription>
        </DialogHeader>
        {loading && <p role="status">Actualizando ficha…</p>}
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        {detail && (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Congregación", detail.congregation],
                ["Teléfono", detail.phone ?? "No disponible"],
                ["Inscripción", detail.registrationStatus],
                ["Perfil", detail.profileActive ? "Activo" : "Inactivo"],
                ["Máximo de turnos", detail.maxTurns ?? "Sin límite"],
                ["Bloques disponibles actuales", detail.availableBlockCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-slate-600">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <LinkSummary row={detail} />
            <section>
              <h3 className="font-semibold">Disponibilidad seleccionada</h3>
              <p className="text-sm text-slate-600">
                Los bloques históricos o inactivos no cuentan en la cobertura
                actual.
              </p>
              {!detail.availability.length && (
                <p>No tiene bloques seleccionados.</p>
              )}
              <ul className="mt-2 space-y-2">
                {detail.availability.map((block) => (
                  <li
                    key={block.blockId}
                    className="rounded border p-2 text-sm"
                  >
                    <BlockText block={block} /> ·{" "}
                    <span
                      className={
                        block.active ? "text-teal-800" : "text-slate-600"
                      }
                    >
                      {block.active ? "Actual" : "Histórico / inactivo"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="font-semibold">Solicitudes y vínculos</h3>
              {!detail.pairRequests.length && <p>No hay solicitudes.</p>}
              <ul className="mt-2 space-y-3">
                {detail.pairRequests.map((pair) => (
                  <li
                    key={pair.id}
                    className="space-y-1 rounded border p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {pair.otherName} · {pair.status}
                    </p>
                    <p>{pair.direction === "sent" ? "Enviada" : "Recibida"}</p>
                    {pair.status === "accepted" && (
                      <p>Vínculo obligatorio para la futura planificación.</p>
                    )}
                    {pair.availabilityConflict && (
                      <p className="text-amber-800">
                        Sin bloques activos en común
                        {pair.status === "accepted"
                          ? ": conflicto de disponibilidad"
                          : ""}
                        .
                      </p>
                    )}
                    {pair.participationConflict && (
                      <p className="text-amber-800">
                        Revisar inscripción o perfil de ambos participantes.
                      </p>
                    )}
                    {!!pair.sharedBlocks.length && (
                      <>
                        <p>Bloques actuales en común:</p>
                        <ul>
                          {pair.sharedBlocks.map((block) => (
                            <li key={block.blockId}>
                              <BlockText block={block} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
