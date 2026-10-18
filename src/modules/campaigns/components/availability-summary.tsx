import { CalendarDays, UsersRound } from "lucide-react";
import React from "react";

export type AvailabilitySummaryDay = {
  id: string; date: string;
  blocks: { id: string; startTime: string; endTime: string; selected: boolean; companions?: string[] }[];
};

export function AvailabilitySummary({ days }: { days: AvailabilitySummaryDay[] }) {
  const selectedDays = days.filter((day) => day.blocks.some((block) => block.selected));
  if (!selectedDays.length) return <p className="text-slate-600">No hay horarios de disponibilidad guardados.</p>;
  return <div className="space-y-3">{selectedDays.map((day) => <section key={day.id} className="overflow-hidden rounded-2xl border border-[var(--campaign-line)] bg-white">
    <h3 className="flex items-center gap-2 bg-[var(--campaign-mint)] px-4 py-3 font-bold"><CalendarDays className="h-5 w-5" aria-hidden="true" />{new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day.date}T12:00:00`)).replace(/^./u, (letter) => letter.toUpperCase())}</h3>
    <ul className="divide-y divide-[var(--campaign-line)]">{day.blocks.filter((block) => block.selected).map((block) => <li key={block.id} className="space-y-1 px-4 py-3">
      <p className="text-lg font-semibold">{block.startTime} – {block.endTime}</p>
      {block.companions?.map((name, index) => <p key={index} className="flex items-start gap-2 text-sm text-[var(--campaign-primary-strong)]"><UsersRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{name}</span></p>)}
    </li>)}</ul>
  </section>)}</div>;
}
