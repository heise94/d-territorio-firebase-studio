"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, CircleDot, GanttChartSquare, UserCheck, ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS, PermissionId } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";


export interface NavItemConfig {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionId;
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
  { title: "Mis Asignaciones", href: "/asignaciones", icon: CheckSquare, permission: PERMISSIONS.VIEW_OWN_ASSIGNMENTS, segment: "asignaciones" },
  { title: "Mi Disponibilidad", href: "/disponibilidad", icon: UserCog, permission: PERMISSIONS.MANAGE_OWN_AVAILABILITY, segment: "disponibilidad" },
  {
    title: "Mi Grupo",
    href: "/mi-grupo", 
    icon: UserCheck, 
    segment: "mi-grupo",
    children: [
        { title: "Programa Grupo", href: "/mi-grupo/programa", icon: CalendarDays, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, segment: "programa" },
        { title: "Publicadores", href: "/mi-grupo/publicadores", icon: Users, permission: PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS, segment: "publicadores"},
        { title: "Casas del Grupo", href: "/mi-grupo/casas", icon: Building, permission: PERMISSIONS.MANAGE_OWN_GROUP_CASAS, segment: "casas" },
    ]
  },
  { title: "Configuración", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, segment: "settings" }, 
];

export function SidebarNav() {
  const pathname = usePathname() ?? "";
  const { hasPermission, isLoadingPermissions } = usePermissions();

  if (isLoadingPermissions) {
    return (
      <div className="space-y-2 px-2 py-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }
  
  const createNavItem = (item: NavItemConfig) => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }
    const Icon = item.icon;
    const isActive = pathname === item.href;
    
    return (
        <Link
            key={item.title}
            href={item.href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
            )}
            >
            <Icon className="h-4 w-4" />
            {item.title}
        </Link>
    )
  }

  const createNavGroup = (item: NavItemConfig) => {
    const visibleChildren = item.children?.filter(child => !child.permission || hasPermission(child.permission)) || [];
    if (visibleChildren.length === 0) return null;
    
    const Icon = item.icon;
    const isGroupActive = pathname.startsWith(item.href);

    return (
        <Accordion type="single" collapsible key={item.title} defaultValue={isGroupActive ? item.title : ""}>
            <AccordionItem value={item.title} className="border-b-0">
                <AccordionTrigger className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                    isGroupActive && "text-primary"
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
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.children) {
      return item.children.some(child => !child.permission || hasPermission(child.permission));
    }
    return true;
  });

  return (
    <nav className="grid items-start gap-y-1 px-2 text-sm font-medium lg:px-4">
        {visibleNavItems.map(item => 
            item.children ? createNavGroup(item) : createNavItem(item)
        )}
    </nav>
  );
}
