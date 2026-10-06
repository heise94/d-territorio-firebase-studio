"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PersonalProgram } from "../domain/program";
import { campaignFetch } from "../lib/campaign-fetch";

export function ParticipantNextTurn() {
  const [program, setProgram] = useState<PersonalProgram | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await campaignFetch(
          "/api/campanas/participant/my-program",
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error("No pudimos revisar tu próximo turno.");
        setProgram(await response.json());
        setError("");
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No pudimos revisar tu próximo turno.",
          );
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const timer = setInterval(visible, 15000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("campanas-notification", visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("campanas-notification", visible);
    };
  }, []);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone:
        process.env.NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE || "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const now = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  const turn = program?.campaigns
    .flatMap((c) =>
      c.published ? c.turns.map((t) => ({ ...t, campaignName: c.name })) : [],
    )
    .filter((t) => `${t.date}T${t.endTime}` >= now)
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    )[0];
  return (
    <section
      className="space-y-2 rounded-2xl border bg-teal-50 p-5"
      aria-label="Próximo turno"
    >
      <h2 className="text-xl font-bold">Próximo turno</h2>
      {error ? (
        <p role="alert">{error}</p>
      ) : !program ? (
        <p>Consultando tu programa…</p>
      ) : turn ? (
        <>
          <p className="font-semibold">{turn.campaignName}</p>
          <p>
            {turn.date} · {turn.startTime}–{turn.endTime}
          </p>
          <p>{turn.pointName}</p>
        </>
      ) : (
        <p>No tienes próximos turnos en el programa publicado.</p>
      )}
      <Link
        href="/campanas/mi-programa"
        prefetch={false}
        className="inline-flex min-h-12 items-center font-semibold text-teal-800 underline"
      >
        Revisar Mi programa
      </Link>
    </section>
  );
}
