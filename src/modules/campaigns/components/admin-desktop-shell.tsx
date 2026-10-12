"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { OrganizerRole } from "../domain/organizer";
import { campaignNavigation } from "../lib/admin-navigation";
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

const icons = {
  Resumen: LayoutDashboard,
  Campaña: Settings2,
  "Horarios y puntos": CalendarDays,
  Participantes: Users,
  Planificación: ClipboardList,
  Programa: FileText,
  Solicitudes: Wrench,
  Información: MapPinned,
  "Mi congregación": Users,
};

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
  const [access, setAccess] = useState<{
    uid: string;
    campaignId: string;
    role: OrganizerRole;
  } | null>(null);
  const role =
    access && access.uid === user?.uid && access.campaignId === campaignId
      ? access.role
      : null;
  useEffect(() => {
    let active = true;
    let requestNumber = 0;
    const refreshAccess = async () => {
      const currentRequest = ++requestNumber;
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
        if (active && currentRequest === requestNumber)
          setAccess(
            r.ok
              ? {
                  uid: user.uid,
                  campaignId,
                  role: b.role,
                }
              : null,
          );
      } catch {
        if (active && currentRequest === requestNumber) setAccess(null);
      }
    };
    void refreshAccess();
    window.addEventListener("focus", refreshAccess);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshAccess);
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
            {campaignNavigation(role, campaignId).map(
              ({ label, href: target, section: targetSection }) => {
                const Icon = icons[label as keyof typeof icons];
                const active =
                  pathname === target.split("?")[0] &&
                  (!pathname.includes("/campana/") ||
                    section === targetSection);
                return (
                  <Link
                    key={label}
                    href={target}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white/15 shadow-sm" : "text-teal-50/85 hover:bg-white/10"}`}
                  >
                    <Icon size={20} />
                    {label}
                  </Link>
                );
              },
            )}
          </nav>
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
