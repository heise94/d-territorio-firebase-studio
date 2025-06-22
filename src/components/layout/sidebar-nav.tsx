
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, CircleDot, GanttChartSquare, UserCheck, ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
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
    segment: "programa", // Segment for the parent accordion item
    children: [
      { title: "Mensual", href: "/programa", icon: CircleDot, permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM, segment: "programa" }, // Child segment should match exact sub-path or be unique if needed
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
  { title: "Reportes", href: "/reportes", icon: FileText, permission: PERMISSIONS.VIEW_REPORTS, segment: "reportes" },
  { title: "Configuración", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, segment: "settings" }, 
];


export function SidebarNav() {
  const pathname = usePathname() ?? "";
  const { hasPermission, isLoadingPermissions } = usePermissions();

  if (isLoadingPermissions) {
    return (
      <div className="p-2 space-y-1">
        {[...Array(8)].map((_, i) => <SidebarMenuSkeleton key={i} showIcon />)}
      </div>
    );
  }

  const renderNavItem = (item: NavItemConfig) => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const Icon = item.icon;
    const isActive = item.children 
      ? pathname.startsWith(item.href) && item.href !== "/"
      : pathname === item.href;

    const visibleChildren = item.children?.filter(child => !child.permission || hasPermission(child.permission)) || [];
    const hasVisibleChildren = visibleChildren.length > 0;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive && !hasVisibleChildren} // Only active if it's a direct link without children
          tooltip={{
            children: item.title,
            side: "right",
            align: "center",
          }}
        >
          <Link href={hasVisibleChildren ? "#" : item.href}>
            <Icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {hasVisibleChildren && (
          <SidebarMenuSub>
            {visibleChildren.map(child => {
               const isChildActive = pathname === child.href;
               return (
                <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton asChild isActive={isChildActive}>
                        <Link href={child.href}>
                            {child.title}
                        </Link>
                    </SidebarMenuSubButton>
                </SidebarMenuSubItem>
               )
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  };

  const visibleNavItems = navItems.filter(item => {
     if (item.permission && !hasPermission(item.permission)) return false;
     if (item.children) {
        return item.children.some(child => !child.permission || hasPermission(child.permission));
     }
     return true;
  });

  return (
    <SidebarMenu>
      {visibleNavItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
