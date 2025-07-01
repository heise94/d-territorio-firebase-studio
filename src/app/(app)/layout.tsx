"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Menu, XCircle, ChevronLeft } from 'lucide-react'; 
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserNav } from '@/components/layout/user-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { Button } from '@/components/ui/button';
import { PermissionsProvider, usePermissions } from '@/hooks/use-permissions';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Notifications } from '@/components/layout/notifications';
import { cn } from '@/lib/utils';

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { 
    userProfile, 
    isLoadingPermissions, 
    isImpersonating, 
    stopImpersonation 
  } = usePermissions(); 
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoadingPermissions || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const handleStopImpersonation = () => {
    stopImpersonation();
    router.push('/usuarios'); 
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
      <div className={cn("hidden border-r bg-muted/40 md:flex md:flex-col transition-all duration-300 ease-in-out", isSidebarCollapsed ? "w-[72px]" : "w-[240px]")}>
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <AppLogo isCollapsed={isSidebarCollapsed} />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarNav isCollapsed={isSidebarCollapsed} />
        </div>
        {/* The collapse button has been moved to the main header */}
      </div>
      <div className="flex flex-col">
        {isImpersonating && userProfile && (
            <Alert variant="destructive" className="sticky top-0 z-50 rounded-none border-l-0 border-r-0 border-t-0 bg-yellow-500/90 text-yellow-900 dark:bg-yellow-700/90 dark:text-yellow-100 backdrop-blur-sm">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between h-12">
                    <div className="flex items-center">
                        <AlertTitle className="font-bold mr-2">¡Modo Suplantación Activo!</AlertTitle>
                        <AlertDescription className="text-sm">
                            Estás viendo como <span className="font-semibold">{userProfile.name}</span> ({userProfile.role}).
                        </AlertDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStopImpersonation}
                        className="bg-yellow-600 hover:bg-yellow-700 border-yellow-700 text-white dark:bg-yellow-800 dark:hover:bg-yellow-900 dark:border-yellow-900 dark:text-yellow-50"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Dejar de Suplantar
                    </Button>
                </div>
            </Alert>
        )}
        <header className="relative flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-[240px]">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <AppLogo />
                    <SheetTitle className="sr-only">Navegación</SheetTitle>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <SidebarNav isCollapsed={false} />
                </div>
            </SheetContent>
          </Sheet>
          
          {/* New Sidebar Toggle Button for Desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hidden md:flex"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", isSidebarCollapsed && "rotate-180")} />
            <span className="sr-only">Contraer menú</span>
          </Button>
           
           <div className="w-full flex-1" />
           <Notifications />
           <ThemeToggle />
           <UserNav />
        </header>
        <main className="flex-1 p-4 lg:p-6 pb-24 md:pb-10">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </PermissionsProvider>
  );
}
