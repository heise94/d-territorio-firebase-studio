"use client";
import Link from "next/link";
import { Bell, CalendarDays, Home, Info, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { campaignFetch } from "../lib/campaign-fetch";

export function ParticipantNavigation({
  active,
}: {
  active: "Inicio" | "Disponibilidad" | "Mi programa" | "Avisos" | "Información";
}) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let live = true;
    const refresh = () => { if (document.visibilityState === "visible") void campaignFetch("/api/campanas/participant/notifications?limit=1", { cache: "no-store" }).then(async (reply) => { if (!reply.ok) return; const data = await reply.json(); if (live) setUnread(Number(data.unreadCount) || 0); }).catch(() => {}); };
    refresh(); window.addEventListener("campanas-notification", refresh); const timer = window.setInterval(refresh, 30_000);
    return () => { live = false; window.removeEventListener("campanas-notification", refresh); window.clearInterval(timer); };
  }, []);
  const items = [
    { label: "Inicio", icon: Home, href: "/campanas" },
    {
      label: "Disponibilidad",
      icon: CalendarDays,
      href: "/campanas/disponibilidad",
    },
    { label: "Mi programa", icon: ListChecks, href: "/campanas/mi-programa" },
    { label: "Avisos", icon: Bell, href: "/campanas/avisos" },
    { label: "Información", icon: Info, href: "/campanas/informacion" },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-slate-200 bg-white px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
      aria-label="Navegación principal de Campaña exhibidores"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map(({ label, icon: Icon, href }) => {
          const content = (
            <>
              <span className="relative"><Icon className="mb-1 h-5 w-5" aria-hidden="true" />{label === "Avisos" && unread > 0 && <span aria-label={`${unread} avisos nuevos`} className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{unread > 9 ? "9+" : unread}</span>}</span>
              <span>{label}</span>
            </>
          );
          const classes = `flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-xs font-semibold ${active === label ? "bg-teal-100 text-teal-800" : "text-slate-600"}`;
          return href ? (
            <Link
              key={label}
              href={href}
              prefetch={false}
              aria-current={active === label ? "page" : undefined}
              className={`${classes} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700`}
            >
              {content}
            </Link>
          ) : null;
        })}
      </div>
    </nav>
  );
}
