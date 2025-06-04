"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions"; // To display role
import { LogOut, UserCircle, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function UserNav() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { userProfile, isLoadingPermissions } = usePermissions();

  if (authLoading || isLoadingPermissions) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return null; 
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const nameParts = name.split(" ");
      if (nameParts.length > 1) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      const emailParts = email.split("@")[0].split(/[._-]/);
      if (emailParts.length > 1 && emailParts[0] && emailParts[1]) {
        return (emailParts[0][0] + emailParts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };
  
  const displayName = userProfile?.name || user.displayName || user.email?.split('@')[0] || "Usuario";
  const displayRole = userProfile?.role || "Rol no asignado";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || undefined} alt={displayName} />
            <AvatarFallback>{getInitials(userProfile?.name, user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
             <p className="text-xs leading-none text-muted-foreground pt-1">
              Rol: <span className="font-medium text-foreground">{displayRole}</span>
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Placeholder for Profile Link - to be implemented in later phases */}
          {/* <Link href="/perfil"> 
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Perfil</span>
            </DropdownMenuItem>
          </Link> */}
          <Link href="/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Configuración</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:focus:!bg-red-900/20">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
