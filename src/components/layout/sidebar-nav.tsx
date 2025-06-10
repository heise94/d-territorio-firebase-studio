
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MapIcon as Map, Building, Users2 as GroupIcon, LayoutDashboard, Settings, FileText, CalendarDays, CheckSquare, UserCog, LogOut, CircleDot, GanttChartSquare, UserCheck, Activity, ListChecks
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

  const checkActive = (itemHref: string, itemSegment?: string, isParent?: boolean) => {
    const cleanPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    const cleanItemHref = itemHref.endsWith('/') && itemHref.length > 1 ? itemHref.slice(0, -1) : itemHref;

    if (itemSegment) {
      const pathSegments = cleanPathname.split('/');
      
      if(isParent) {
        // For parent accordion items, it's active if its base segment is in the path.
        // e.g., if path is /mi-actividad/asignaciones, and itemSegment is "mi-actividad", it's active.
        return pathSegments.includes(itemSegment);
      }
      // For child items, check if its own segment is the *last relevant* segment in the path
      // AND the parent's segment is also present.
      // Example: path="/mi-actividad/asignaciones", child segment="asignaciones", parent segment="mi-actividad"
      // Needs to ensure both parent and child segments are matched appropriately.
      // A simple approach for children: exact href match or path ends with its segment and starts with parent's href.
      if (cleanPathname === cleanItemHref) return true;
      
      // More robust check for child active state:
      // Path should start with parent's base href (e.g. /mi-actividad)
      // And the current item's segment should be present (e.g. "asignaciones")
      // For child: /mi-actividad/asignaciones, itemHref: /mi-actividad/asignaciones, itemSegment: asignaciones
      // Parent: /mi-actividad, parentSegment: mi-actividad
      // Ensure parentSegment is correctly derived if itemHref doesn't have children.
      const lastSlashIndex = itemHref.lastIndexOf('/');
      const parentPath = lastSlashIndex > 0 ? itemHref.substring(0, lastSlashIndex) : itemHref; // if no slash, or root, use full href
      
      if (cleanPathname === cleanItemHref) return true;
      // If itemHref is like /parent/child and itemSegment is child
      // path should be /parent/child
      if (cleanPathname.startsWith(parentPath) && pathSegments.includes(itemSegment) && cleanPathname.endsWith(itemSegment)) return true;
      // If itemHref is like /parent and itemSegment is parent (not an accordion parent)
      // path should be /parent
      if(cleanItemHref === cleanPathname && pathSegments.includes(itemSegment)) return true;
      
      return false;

    }
    return cleanPathname === cleanItemHref;
  };
  
  const renderNavItem = (item: NavItemConfig, isSubmenu = false): JSX.Element | null => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const Icon = item.icon;
    // For parent accordion triggers, active state might depend on if any child is active or if path starts with parent href
    const isParentAccordion = !!(item.children && item.children.length > 0);
    const isActive = checkActive(item.href, item.segment, isParentAccordion);
    
    const commonLinkClasses = cn(
      "flex items-center w-full px-3 rounded-md text-sm font-medium transition-colors",
       isActive && !isParentAccordion ? "bg-primary text-primary-foreground" 
       : isActive && isParentAccordion ? "bg-sidebar-accent text-sidebar-accent-foreground" // Special style for active parent accordion
       : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
       isSubmenu ? "pl-8 text-[0.9rem] py-1.5" : "py-2.5" 
    );

    if (item.children && item.children.length > 0) {
      const visibleChildren = item.children.filter(child => !child.permission || hasPermission(child.permission));
      if (visibleChildren.length === 0 && item.href === "#") return null; 

      return (
        <AccordionItem value={item.title} key={item.title} className="border-none">
          <AccordionTrigger 
            className={cn(commonLinkClasses, "justify-between hover:no-underline")}
          >
            <span className="flex items-center">
                <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive && isParentAccordion ? "text-primary" : "")} />
                {item.title}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-0 pl-5 border-l border-sidebar-border ml-[calc(0.75rem+10px)] mt-1"> 
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
