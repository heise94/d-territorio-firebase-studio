
"use client";

import { useState, useMemo, useEffect, ReactNode } from "react";
import { Bell, Check, UserPlus, ThumbsDown, MessageSquareWarning, FileText, CheckCircle2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";

// Mock data - replace with actual data fetching from Firestore in the future
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "N1",
    type: "user_needs_approval",
    title: "Nuevo Usuario Registrado",
    description: "Carlos Rivas se ha registrado y necesita aprobación.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 5)), // 5 mins ago
    isRead: false,
    recipientUserId: "admin",
    sender: { id: "userCarlos", name: "Carlos Rivas" },
  },
  {
    id: "N2",
    type: "replacement_requested",
    title: "Reemplazo Solicitado",
    description: "Ana Pérez ha solicitado un reemplazo para su asignación en 'Plaza Central'.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)), // 30 mins ago
    isRead: false,
    recipientUserId: "admin",
    sender: { id: "userAna", name: "Ana Pérez" },
  },
  {
    id: "N3",
    type: "report_submitted",
    title: "Reporte Recibido",
    description: "Luis Gómez ha enviado el reporte para el territorio 'Sector El Peral'.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 120)), // 2 hours ago
    isRead: true,
    recipientUserId: "admin",
    sender: { id: "userLuis", name: "Luis Gómez" },
  },
   {
    id: "N4",
    type: "new_assignment",
    title: "Nueva Asignación Recibida",
    description: "Has sido asignado a la predicación en 'Parque Las Acacias'.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 4)), // 4 hours ago
    isRead: false,
    recipientUserId: "regular_user",
  },
   {
    id: "N5",
    type: "assignment_rejected",
    title: "Asignación Rechazada",
    description: "Sofía Castro ha rechazado la asignación en 'Vereda El Rosal'.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 8)), // 8 hours ago
    isRead: false,
    recipientUserId: "admin",
    sender: { id: "userSofia", name: "Sofía Castro" },
  },
   {
    id: "N6",
    type: "replacement_covered",
    title: "Reemplazo Cubierto",
    description: "Tu solicitud de reemplazo para 'Plaza Central' ha sido cubierta.",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)), // 1 day ago
    isRead: true,
    recipientUserId: "regular_user",
  },
];


const NotificationIcon = ({ type }: { type: NotificationType }) => {
    const iconClass = "h-4 w-4 mr-3 text-muted-foreground";
    switch (type) {
        case 'user_needs_approval': return <UserPlus className={iconClass} />;
        case 'assignment_rejected': return <ThumbsDown className={iconClass} />;
        case 'replacement_requested': return <UserMinus className={iconClass} />;
        case 'report_submitted': return <FileText className={iconClass} />;
        case 'new_assignment': return <CheckCircle2 className={iconClass} />;
        default: return <MessageSquareWarning className={iconClass} />;
    }
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const { userProfile } = usePermissions();

  const userNotifications = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === USER_ROLES.ENCARGADO_TERRITORIO) {
      return notifications.filter(n => n.recipientUserId === 'admin');
    }
    return notifications.filter(n => n.recipientUserId === 'regular_user');
  }, [notifications, userProfile]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-1 right-1 h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[0.6rem]"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel className="flex justify-between items-center">
          Notificaciones
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todo como leído
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
            {userNotifications.length > 0 ? (
                userNotifications.map((notification) => (
                    <DropdownMenuItem
                        key={notification.id}
                        className={cn("flex items-start gap-2 h-auto py-2.5 px-3 cursor-pointer", !notification.isRead && "bg-primary/5")}
                        onClick={() => markAsRead(notification.id)}
                    >
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 space-y-0.5">
                            <p className="text-xs font-semibold">{notification.title}</p>
                            <p className="text-xs text-muted-foreground whitespace-normal">
                                {notification.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1">
                                {formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                         {!notification.isRead && (
                             <div className="h-2 w-2 rounded-full bg-primary shrink-0 self-center ml-2" />
                         )}
                    </DropdownMenuItem>
                ))
            ) : (
                <div className="text-center text-sm text-muted-foreground py-10 px-4">
                    No tienes notificaciones nuevas.
                </div>
            )}
        </ScrollArea>
        {/* Can add a footer link later */}
        {/* <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-xs text-muted-foreground hover:!bg-background cursor-pointer">
            Ver todas las notificaciones
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
