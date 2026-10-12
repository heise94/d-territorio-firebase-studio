"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPinned,
  Presentation,
  Settings2,
  Users,
  Wrench,
  ChevronLeft,
} from "lucide-react";

const items = [
  ["Resumen", LayoutDashboard, (id: string) => `/campanas/admin/resumen/${id}`],
  ["Campaña", Settings2, (id: string) => `/campanas/admin/campana/${id}`],
  [
    "Horarios y puntos",
    CalendarDays,
    (id: string) => `/campanas/admin/campana/${id}?seccion=horarios`,
  ],
  [
    "Participantes",
    Users,
    (id: string) => `/campanas/admin/participantes/${id}`,
  ],
  [
    "Planificación",
    ClipboardList,
    (id: string) => `/campanas/admin/planificar/${id}`,
  ],
  ["Programa", FileText, (id: string) => `/campanas/admin/programa/${id}`],
  ["Solicitudes", Wrench, (id: string) => `/campanas/admin/cambios/${id}`],
  [
    "Información",
    MapPinned,
    (id: string) => `/campanas/admin/campana/${id}?seccion=informacion`,
  ],
] as const;

export function AdminDesktopShell({
  campaignId,
  section = "general",
  children,
}: {
  campaignId?: string;
  section?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [responsible, setResponsible] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user || !campaignId) return;
        const r = await fetch(
          `/api/campanas/admin/campaigns/${encodeURIComponent(campaignId)}/access`,
          {
            headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
            cache: "no-store",
          },
        );
        const b = await r.json();
        if (active)
          setResponsible(r.ok && b.role === "CONGREGATION_RESPONSIBLE");
      } catch {
        if (active) setResponsible(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [campaignId, user]);
  return (
    <div className="campaign-admin-shell min-h-screen bg-[#f6f5f1] text-slate-900 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen bg-gradient-to-b from-[#004b4e] via-[#006268] to-[#063f45] p-4 text-white lg:block">
        <Link
          href="/campanas/admin"
          className="mb-10 flex items-center gap-3 px-3 pt-4 text-xl font-bold"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <Presentation aria-hidden="true" className="h-8 w-8" />
          </span>
          D-Territorio
        </Link>
        <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[.16em] text-teal-100/70">
          {campaignId ? "Campaña" : "Plataforma"}
        </p>
        {!campaignId ? (
          <nav>
            <Link
              href="/campanas/admin"
              className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-3 text-sm font-semibold"
            >
              <ClipboardList size={20} />
              Campañas
            </Link>
          </nav>
        ) : (
          <nav className="space-y-1">
            {items.map(([label, Icon, href]) => {
              const target = href(campaignId);
              const targetSection =
                label === "Horarios y puntos"
                  ? "horarios"
                  : label === "Información"
                    ? "informacion"
                    : "general";
              const active =
                pathname === target.split("?")[0] &&
                (!pathname.includes("/campana/") || section === targetSection);
              return (
                <Link
                  key={label}
                  href={target}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white/15 shadow-sm" : "text-teal-50/85 hover:bg-white/10"}`}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
        {responsible && (
          <div className="mt-5 border-t border-white/15 pt-4">
            <Link
              href={`/campanas/admin/mi-congregacion/${campaignId}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-teal-50 hover:bg-white/10 ${pathname === `/campanas/admin/mi-congregacion/${campaignId}` ? "bg-white/15" : ""}`}
            >
              <Users size={20} />
              Mi congregación
            </Link>
          </div>
        )}
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-5 backdrop-blur lg:px-9">
          <Link
            href="/campanas/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800"
          >
            <ChevronLeft size={18} />
            Campañas
          </Link>
          <div className="hidden rounded-xl bg-slate-100 px-5 py-3 text-sm text-slate-500 md:block">
            {campaignId
              ? "Administración de campaña"
              : "Administración de plataforma"}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
