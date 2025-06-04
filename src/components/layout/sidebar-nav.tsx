"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, LogOut, CircleDot, GanttChartSquare, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  segment?: string; // For more precise active state matching
}

const navItems: NavItemConfig[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD, segment: "dashboard" },
  { title: "Usuarios", href: "/usuarios", icon: Users, permission: PERMISSIONS.VIEW_USERS, segment: "usuarios" }, // Changed to VIEW_USERS for general access, MANAGE for actions
  { title: "Territorios", href: "/territorios", icon: Map, permission: PERMISSIONS.VIEW_TERRITORIES, segment: "territorios" },
  { title: "Casas", href: "/casas", icon: Building, permission: PERMISSIONS.VIEW_CASAS, segment: "casas" },
  { title: "Grupos", href: "/grupos", icon: GroupIcon, permission: PERMISSIONS.VIEW_GROUPS, segment: "grupos" },
  {
    title: "Programa",
    href: "/programa", // Base href for the section
    icon: CalendarDays,
    // permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM, // Parent permission
    segment: "programa",
    children: [
      { title: "Mensual", href: "/programa", icon: CircleDot, permission: PERMISSIONS.VIEW_MONTHLY_PROGRAM, segment: "programa" }, // Removed / from end
      { title: "Semanal", href: "/programa/semanal", icon: GanttChartSquare, permission: PERMISSIONS.VIEW_WEEKLY_PROGRAM, segment: "semanal" },
    ]
  },
  { title: "Mis Asignaciones", href: "/asignaciones", icon: CheckSquare, permission: PERMISSIONS.VIEW_OWN_ASSIGNMENTS, segment: "asignaciones" },
  { title: "Mi Disponibilidad", href: "/disponibilidad", icon: UserCog, permission: PERMISSIONS.MANAGE_OWN_AVAILABILITY, segment: "disponibilidad" },
  {
    title: "Mi Grupo",
    href: "/mi-grupo", // Base href for the section
    icon: UserCheck, // Changed icon
    // permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, // Parent permission for SG
    segment: "mi-grupo",
    children: [
        { title: "Programa Grupo", href: "/mi-grupo/programa", icon: CalendarDays, permission: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, segment: "programa" },
        { title: "Publicadores", href: "/mi-grupo/publicadores", icon: Users, permission: PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS, segment: "publicadores"},
        { title: "Casas del Grupo", href: "/mi-grupo/casas", icon: Building, permission: PERMISSIONS.MANAGE_OWN_GROUP_CASAS, segment: "casas" },
    ]
  },
  { title: "Reportes", href: "/reportes", icon: FileText, permission: PERMISSIONS.VIEW_REPORTS, segment: "reportes" },
  { title: "Configuración", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, segment: "settings" }, // Example permission
];


export function SidebarNav() {
  const pathname = usePathname() ?? "";
  const { hasPermission, isLoadingPermissions } = usePermissions();

  const checkActive = (itemHref: string, itemSegment?: string, isParent?: boolean) => {
    const cleanPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    const cleanItemHref = itemHref.endsWith('/') && itemHref.length > 1 ? itemHref.slice(0, -1) : itemHref;

    if (itemSegment) {
      const pathSegments = cleanPathname.split('/');
      // For parent items, check if current path starts with item's base path
      // For child items, check for exact match or if it's the main page of a sub-section
      if(isParent) return pathSegments.includes(itemSegment);
      return cleanPathname === cleanItemHref || (pathSegments.includes(itemSegment) && cleanPathname.endsWith(itemSegment));

    }
    return cleanPathname === cleanItemHref;
  };
  
  const renderNavItem = (item: NavItemConfig, isSubmenu = false): JSX.Element | null => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const Icon = item.icon;
    const isActive = checkActive(item.href, item.segment, !!(item.children && item.children.length > 0));
    
    const commonLinkClasses = cn(
      "flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
       isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
       isSubmenu ? "pl-8 text-[0.9rem] py-1.5" : "py-2.5" 
    );

    if (item.children && item.children.length > 0) {
      const visibleChildren = item.children.filter(child => !child.permission || hasPermission(child.permission));
      if (visibleChildren.length === 0 && item.href === "#") return null; // Hide parent if no visible children and it's not a link itself

      return (
        <AccordionItem value={item.title} key={item.title} className="border-none">
          <AccordionTrigger 
            className={cn(commonLinkClasses, "justify-between hover:no-underline", isActive && !isSubmenu ? "bg-primary/10 text-primary" : "")}
            // If the parent itself is a link, wrap content in Link, else just span
            // For simplicity, parent is not a direct link here, it expands
          >
            <span className="flex items-center">
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-primary" : "")} />
                {item.title}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-0 pl-5 border-l border-sidebar-border ml-[calc(0.75rem+10px)] mt-1"> {/* 10px is half of icon width */}
            <ul className="space-y-0.5">
              {visibleChildren.map(child => (
                <li key={child.href}>{renderNavItem(child, true)}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      );
    }

    return (
      <li className="list-none" key={item.href}>
        <Link href={item.href} className={commonLinkClasses}>
          <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive && !isSubmenu ? "text-primary-foreground" : isActive && isSubmenu ? "text-primary" : "")} />
          {item.title}
        </Link>
      </li>
    );
  };

  if (isLoadingPermissions) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
      </div>
    );
  }

  const visibleNavItems = navItems.filter(item => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.children && item.children.length > 0) {
      // Show parent if it has no permission itself OR if any child is visible
      return !item.permission || hasPermission(item.permission) || item.children.some(child => !child.permission || hasPermission(child.permission));
    }
    return true;
  });


  return (
    <ScrollArea className="h-full flex-1">
      <Accordion type="multiple" className="w-full space-y-1 p-2">
        {visibleNavItems.map(item => renderNavItem(item))}
      </Accordion>
    </ScrollArea>
  );
}
