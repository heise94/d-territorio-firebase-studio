"use client";
import Link from "next/link";
import Image from "next/image";
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
  Settings2,
  Users,
  Wrench,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [collapsed, setCollapsed] = useState(false);
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
  useEffect(() => {
    setCollapsed(window.sessionStorage.getItem("campaign-admin-sidebar-collapsed") === "true");
  }, []);
  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.sessionStorage.setItem("campaign-admin-sidebar-collapsed", String(next));
      return next;
    });
  }
  return (
    <div className={`campaign-admin-shell min-h-screen bg-[#f6f5f1] text-slate-900 lg:grid ${collapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"}`}>
      <aside className={`hidden min-h-screen bg-gradient-to-b from-[#004b4e] via-[#006268] to-[#063f45] p-4 text-white lg:block ${collapsed ? "px-3" : ""}`}>
        <Link
          href="/campanas/admin"
          className={`mb-7 flex items-center gap-3 px-3 pt-4 text-xl font-bold ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Campaña exhibidores" : undefined}
        >
          <Image
            src="/campanas-icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl"
          />
          {!collapsed && "Campaña exhibidores"}
        </Link>
        <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
          {!collapsed && <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-100/70">{campaignId ? "Campaña" : "Plataforma"}</p>}
          <button onClick={toggleSidebar} className="grid h-9 w-9 place-items-center rounded-lg text-teal-50/80 transition hover:bg-white/10" aria-label={collapsed ? "Expandir menú" : "Contraer menú"} title={collapsed ? "Expandir menú" : "Contraer menú"}>{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button>
        </div>
        {!campaignId ? (
          <nav>
            <Link
              href="/campanas/admin"
              className={`flex items-center gap-3 rounded-xl bg-white/15 px-3 py-3 text-sm font-semibold ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? "Campañas" : undefined}
            >
              <ClipboardList size={20} />
              {!collapsed && "Campañas"}
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${collapsed ? "justify-center px-0" : ""} ${active ? "bg-white/15 shadow-sm" : "text-teal-50/85 hover:bg-white/10"}`}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={20} />
                    {!collapsed && label}
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
