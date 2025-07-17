
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, MapIcon as Map, Building, Users2 as GroupIcon, CalendarDays, CheckSquare, ListChecks, FileText, Settings, BarChartHorizontal, Database, Pencil, Bot, Trash2 as CleaningIcon, UserCog, UserCheck
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS, PermissionId, USER_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BottomNavItemConfig {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionId;
  adminOnly?: boolean;
}

// Full list of main navigation items for the bottom bar
const bottomNavItems: BottomNavItemConfig[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD },
  { title: "Mis Asig.", href: "/asignaciones", icon: CheckSquare, permission: PERMISSIONS.VIEW_OWN_ASSIGNMENTS },
  { title: "Territorios", href: "/territorios", icon: Map, permission: PERMISSIONS.VIEW_TERRITORIES },
  { title: "Programa", href: "/programa", icon: CalendarDays, permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM },
  { title: "Aseo", href: "/cleaning/program", icon: CleaningIcon, permission: PERMISSIONS.VIEW_CLEANING_PROGRAM },
  { title: "Casas", href: "/casas", icon: Building, permission: PERMISSIONS.VIEW_CASAS },
  { title: "Grupos", href: "/grupos", icon: GroupIcon, permission: PERMISSIONS.VIEW_GROUPS },
  { title: "Usuarios", href: "/usuarios", icon: Users, permission: PERMISSIONS.VIEW_USERS },
  { title: "Gestión Asig.", href: "/gestion-asignaciones", icon: ListChecks, permission: PERMISSIONS.VIEW_ALL_ASSIGNMENTS },
  { title: "Reportes", href: "/reportes", icon: BarChartHorizontal, permission: PERMISSIONS.VIEW_REPORTS },
  { title: "Editor Hist.", href: "/reportes/editor", icon: Pencil, permission: PERMISSIONS.EDIT_REPORTS },
  { title: "Mi Dispo.", href: "/disponibilidad", icon: UserCog, permission: PERMISSIONS.MANAGE_OWN_AVAILABILITY },
  { title: "Mi Grupo", href: "/mi-grupo/programa", icon: UserCheck, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM },
  { title: "Importar", href: "/admin/import-data", icon: Database, adminOnly: true },
  { title: "Ajustes", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS },
];

export function MobileBottomNav() {
    const pathname = usePathname();
    const { userProfile, hasPermission, isLoadingPermissions } = usePermissions();

    if (isLoadingPermissions) {
        return (
             <footer className="fixed bottom-0 left-0 right-0 z-40 h-[60px] border-t bg-background/95 backdrop-blur-sm md:hidden" />
        );
    }

    // Filter items based on user permissions
    const visibleNavItems = bottomNavItems.filter(item => {
        if(item.adminOnly && userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) return false;
        return !item.permission || hasPermission(item.permission)
    });

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <nav className="flex w-full items-stretch justify-start gap-1 overflow-x-auto p-1.5 no-scrollbar">
                {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    // Make it active if the current path starts with the item's href
                    const isActive = (item.href === "/" && pathname === "/") || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-medium transition-colors",
                                "flex-shrink-0 w-20 h-14",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="truncate w-full text-center">{item.title}</span>
                        </Link>
                    );
                })}
            </nav>
        </footer>
    );
}
