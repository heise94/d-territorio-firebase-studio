
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, CircleDot, GanttChartSquare, UserCheck, ListChecks, BarChartHorizontal, Database, Pencil, Bot, Trash2 as CleaningIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS, PermissionId, USER_ROLES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface NavItemConfig {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionId;
  adminOnly?: boolean;
  children?: NavItemConfig[];
  segment?: string; 
}

const navItems: NavItemConfig[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD, segment: "dashboard" },
  { title: "Usuarios", href: "/usuarios", icon: Users, permission: PERMISSIONS.VIEW_USERS, segment: "usuarios" }, 
  { title: "Territorios", href: "/territorios", icon: Map, permission: PERMISSIONS.VIEW_TERRITORIES, segment: "territorios" },
  { title: "Casas", href: "/casas", icon: Building, permission: PERMISSIONS.VIEW_CASAS, segment: "casas" },
  { title: "Grupos", href: "/grupos", icon: GroupIcon, permission: PERMISSIONS.VIEW_GROUPS, segment: "grupos" },
  {
    title: "Programa",
    href: "/programa", 
    icon: CalendarDays,
    segment: "programa",
    permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM,
    children: [
      { title: "Programa Mensual", href: "/programa", icon: CircleDot, permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM, segment: "programa" },
      { title: "Programa Semanal", href: "/programa/semanal", icon: GanttChartSquare, permission: PERMISSIONS.VIEW_WEEKLY_PROGRAM, segment: "semanal" },
    ]
  },
  { title: "Programa de Aseo", href: "/cleaning/program", icon: CleaningIcon, permission: PERMISSIONS.VIEW_CLEANING_PROGRAM, segment: "cleaning" },
  { title: "Gestión Asignaciones", href: "/gestion-asignaciones", icon: ListChecks, permission: PERMISSIONS.VIEW_ALL_ASSIGNMENTS, segment: "gestion-asignaciones" },
  {
    title: "Reportes",
    href: "/reportes",
    icon: BarChartHorizontal,
    segment: "reportes",
    permission: PERMISSIONS.VIEW_REPORTS,
    children: [
      { title: "Vista General", href: "/reportes", icon: CircleDot, permission: PERMISSIONS.VIEW_REPORTS, segment: "reportes" },
      { title: "Editor de Historial", href: "/reportes/editor", icon: Pencil, permission: PERMISSIONS.EDIT_REPORTS, segment: "editor" },
    ]
  },
  { title: "Mis Asignaciones", href: "/asignaciones", icon: CheckSquare, permission: PERMISSIONS.VIEW_OWN_ASSIGNMENTS, segment: "asignaciones" },
  { title: "Mi Disponibilidad", href: "/disponibilidad", icon: UserCog, permission: PERMISSIONS.MANAGE_OWN_AVAILABILITY, segment: "disponibilidad" },
  {
    title: "Mi Grupo",
    href: "/mi-grupo",
    icon: UserCheck,
    segment: "mi-grupo",
    permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM,
    children: [
        { title: "Programa de Grupo", href: "/mi-grupo/programa", icon: CircleDot, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, segment: "programa"},
        { title: "Publicadores", href: "/mi-grupo/publicadores", icon: Users, permission: PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS, segment: "publicadores" },
        { title: "Casas del Grupo", href: "/mi-grupo/casas", icon: Building, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, segment: "casas" },
    ]
  },
  { title: "Configuración", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, segment: "settings" }, 
  { title: "Importar Historial", href: "/admin/import-data", icon: Database, adminOnly: true, segment: "admin" },
];

export function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname() ?? "";
  const { userProfile, hasPermission, isLoadingPermissions } = usePermissions();

  if (isLoadingPermissions) {
    return (
      <div className="space-y-2 px-4 py-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.children) {
      return item.children.some(child => {
          if (child.adminOnly && userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) return false;
          return !child.permission || hasPermission(child.permission)
      });
    }
    return true;
  });

  return (
    <TooltipProvider delayDuration={0}>
        <nav className="grid items-start gap-1 px-2 py-4 text-sm font-medium lg:px-4">
        {isCollapsed ? (
            visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = (item.href === "/" && pathname === "/") || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                    <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                        <Link
                        href={item.href}
                        className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-muted",
                            isActive && "bg-muted text-primary"
                        )}
                        >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{item.title}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                );
            })
        ) : (
            visibleNavItems.map((item) => {
                const Icon = item.icon;
                
                if (!item.children || item.children.length === 0) {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                            isActive && "bg-muted text-primary"
                        )}
                        >
                        <Icon className="h-4 w-4" />
                        {item.title}
                        </Link>
                    );
                }

                const visibleChildren = item.children.filter(child => {
                    if (child.adminOnly && userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) return false;
                    return !child.permission || hasPermission(child.permission);
                });
                
                if(visibleChildren.length === 0) return null;
                
                const isParentActive = pathname.startsWith(item.href);

                return (
                    <Accordion key={item.href} type="single" collapsible defaultValue={isParentActive ? item.href : undefined} className="w-full">
                    <AccordionItem value={item.href} className="border-b-0">
                        <AccordionTrigger
                        className={cn(
                            "flex items-center justify-between w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                            isParentActive && "text-primary"
                        )}
                        >
                        <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                        </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-8 pt-1 pb-0">
                        <div className="flex flex-col space-y-1">
                            {visibleChildren.map((child) => {
                                const isChildActive = pathname === child.href;
                                return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                    isChildActive && "bg-muted text-primary font-semibold"
                                    )}
                                >
                                    {child.title}
                                </Link>
                                );
                            })}
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                );
            })
        )}
        </nav>
    </TooltipProvider>
  );
}
