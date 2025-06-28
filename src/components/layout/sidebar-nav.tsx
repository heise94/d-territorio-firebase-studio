
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, CircleDot, GanttChartSquare, UserCheck, ListChecks, BarChartHorizontal, Database, Pencil
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
    children: [
      { title: "Mensual", href: "/programa", icon: CircleDot, permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM, segment: "programa" },
      { title: "Semanal", href: "/programa/semanal", icon: GanttChartSquare, permission: PERMISSIONS.VIEW_WEEKLY_PROGRAM, segment: "semanal" },
    ]
  },
  { title: "Gestión Asignaciones", href: "/gestion-asignaciones", icon: ListChecks, permission: PERMISSIONS.VIEW_ALL_ASSIGNMENTS, segment: "gestion-asignaciones" },
  {
    title: "Reportes",
    href: "/reportes",
    icon: BarChartHorizontal,
    segment: "reportes",
    children: [
      { title: "Vista General", href: "/reportes", icon: CircleDot, permission: PERMISSIONS.VIEW_REPORTS, segment: "reportes" },
      { title: "Editor de Historial", href: "/reportes/editor", icon: Pencil, permission: PERMISSIONS.EDIT_REPORTS, segment: "editor" },
    ]
  },
  { title: "Mis Asignaciones", href: "/asignaciones", icon: CheckSquare, permission: PERMISSIONS.VIEW_OWN_ASSIGNMENTS, segment: "asignaciones" },
  { title: "Mi Disponibilidad", href: "/disponibilidad", icon: UserCog, permission: PERMISSIONS.MANAGE_OWN_AVAILABILITY, segment: "disponibilidad" },
  { title: "Programa de Grupo", href: "/mi-grupo/programa", icon: UserCheck, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, segment: "mi-grupo" },
  { title: "Configuración", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, segment: "settings" }, 
  { title: "Importar Historial", href: "/admin/import-data", icon: Database, adminOnly: true, segment: "admin" },
];

export function SidebarNav({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname() ?? "";
  const { userProfile, hasPermission, isLoadingPermissions } = usePermissions();

  if (isLoadingPermissions) {
    return (
      <div className="space-y-2 px-2 py-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }
  
  const createNavItem = (item: NavItemConfig, isChild = false) => {
    const Icon = item.icon;
    const isActive = (pathname === item.href && !item.children) || 
                   (item.children && pathname.startsWith(item.href) && !item.children.some(c => pathname === c.href && c.href !== item.href)) ||
                   (item.href === "/programa" && pathname.startsWith("/programa") && pathname !== "/programa/semanal") || // special case for monthly program
                   (item.href === "/reportes" && pathname.startsWith("/reportes") && pathname !== "/reportes/editor"); // special case for reports general
    
    if (isCollapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary",
                isActive && "bg-muted text-primary"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="sr-only">{item.title}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }
    
    return (
        <Link
            key={item.href}
            href={item.href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary",
                isChild && "text-sm"
            )}
            >
            {!isChild && <Icon className="h-4 w-4" />}
            {item.title}
        </Link>
    )
  }

  const createNavGroup = (item: NavItemConfig) => {
    const visibleChildren = item.children?.filter(child => {
        if (child.adminOnly && userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) return false;
        if (child.permission && !hasPermission(child.permission)) return false;
        return true;
    }) || [];

    if (visibleChildren.length === 0) return null;
    
    if (isCollapsed) {
      return createNavItem(item);
    }
    
    const Icon = item.icon;
    const isGroupActive = item.segment ? pathname.startsWith(`/${item.segment}`) : false;

    return (
        <Accordion type="single" collapsible key={item.title} defaultValue={isGroupActive ? item.title : ""}>
            <AccordionItem value={item.title} className="border-b-0">
                <AccordionTrigger className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                    isGroupActive && !item.children?.some(c => pathname === c.href) && "text-primary"
                )}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 pt-1 pb-0">
                    <nav className="grid items-start gap-1">
                        {visibleChildren.map(child => {
                            const isChildActive = pathname === child.href;
                            return (
                                <Link
                                    key={child.title}
                                    href={child.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                                        isChildActive && "bg-muted text-primary"
                                    )}
                                >
                                    {child.title}
                                </Link>
                            )
                        })}
                    </nav>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
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
    <TooltipProvider>
      <nav className={cn("grid items-start gap-y-1 px-2 text-sm font-medium lg:px-4", isCollapsed && "justify-center px-1")}>
        {visibleNavItems.map(item => 
            item.children ? createNavGroup(item) : createNavItem(item)
        )}
    </nav>
    </TooltipProvider>
  );
}
