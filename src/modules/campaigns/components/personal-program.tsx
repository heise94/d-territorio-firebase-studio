"use client";
import { useEffect, useState } from "react";
import type { PersonalProgram } from "../domain/program";
import { changeStatusLabels } from "../domain/change-request";
import {
  ChangeAlerts,
  ParticipantChangeHistory,
  RequestChange,
} from "./participant-change-requests";
export function PersonalProgramView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<PersonalProgram | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/campanas/participant/my-program", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          setView(null);
          throw new Error(data.error);
        }
        setView(data);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo consultar tu programa.",
          );
      }
    };
    void load();
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 12000);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refreshKey]);
  return (
    <div className="space-y-5">
      <ChangeAlerts />
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {!view && !error && <p role="status">Consultando tu programa…</p>}
      {view?.campaigns.length === 0 && (
        <p>El programa todavía no ha sido publicado.</p>
      )}
      {view?.campaigns.map((campaign, index) => (
        <section key={index} className="space-y-4 rounded-2xl border p-4">
          <h2 className="text-xl font-bold">{campaign.name}</h2>
          {!campaign.published ? (
            <p>El programa todavía no ha sido publicado.</p>
          ) : (
            <>
              <p className="font-semibold text-teal-800">
                Publicado · v{campaign.version}
              </p>
              <p className="text-sm">
                {new Date(campaign.publishedAt!).toLocaleString("es-CL")}
              </p>
              {!campaign.turns.length && (
                <p>No tienes turnos asignados en el programa publicado.</p>
              )}
              {campaign.turns.map((turn, i) => (
                <article
                  key={i}
                  className="space-y-2 rounded-xl bg-teal-50 p-4"
                >
                  <h3 className="font-bold">
                    {turn.date} {turn.dayLabel}
                  </h3>
                  <p className="text-lg font-semibold">
                    {turn.startTime}–{turn.endTime}
                  </p>
                  {turn.blockLabel && <p>{turn.blockLabel}</p>}
                  <p className="font-bold">{turn.pointName}</p>
                  {turn.locationText && <p>{turn.locationText}</p>}
                  {turn.description && <p>{turn.description}</p>}
                  <p>Compañero: {turn.companionName ?? "Pendiente"}</p>
                  {turn.changeRequestStatus && <p className="font-semibold">{changeStatusLabels[turn.changeRequestStatus]}</p>}
                  {turn.turnId && turn.canRequestChange !== false && (
                    <RequestChange
                      turnId={turn.turnId}
                      onSent={() => setRefreshKey((key) => key + 1)}
                    />
                  )}
                </article>
              ))}
            </>
          )}
        </section>
      ))}
      <ParticipantChangeHistory refreshKey={refreshKey} />
    </div>
  );
}
