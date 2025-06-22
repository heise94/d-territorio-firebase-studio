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
import { Timestamp, collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { userProfile } = usePermissions();

  useEffect(() => {
    if (!userProfile?.firebaseAuthUid || !db || Object.keys(db).length === 0) return;

    const recipientIds = userProfile.role === USER_ROLES.ENCARGADO_TERRITORIO 
        ? [userProfile.firebaseAuthUid, 'admin'] 
        : [userProfile.firebaseAuthUid];

    // Firestore would require a composite index for filtering by one field and ordering by another.
    // To avoid this, we'll filter by recipient and then sort the results on the client.
    const notificationsQuery = query(
        collection(db, "notifications"),
        where("recipientUserId", "in", recipientIds),
        limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const fetchedNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp instanceof Timestamp ? doc.data().timestamp : Timestamp.now(),
        } as Notification));
        
        // Sort notifications on the client-side to show the newest first
        const sortedNotifications = fetchedNotifications.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        setNotifications(sortedNotifications);
    }, (error) => {
        console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const notificationRef = doc(db, "notifications", id);
    try {
        await updateDoc(notificationRef, { isRead: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;
    
    // In a real app with many notifications, this should be a batched write or a cloud function.
    // For simplicity here, we update them one by one.
    try {
        await Promise.all(
            unreadNotifications.map(n => updateDoc(doc(db, "notifications", n.id), { isRead: true }))
        );
    } catch(error) {
        console.error("Error marking all notifications as read:", error);
    }
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
            {notifications.length > 0 ? (
                notifications.map((notification) => (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
