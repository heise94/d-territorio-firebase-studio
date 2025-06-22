
"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Menu, XCircle } from 'lucide-react'; 
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserNav } from '@/components/layout/user-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { Button } from '@/components/ui/button';
import { PermissionsProvider, usePermissions } from '@/hooks/use-permissions';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarSeparator } from "@/components/ui/sidebar";
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { 
    userProfile, 
    isLoadingPermissions, 
    isImpersonating, 
    stopImpersonation 
  } = usePermissions(); 
  const router = useRouter();

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
     <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" variant="sidebar" className="hidden md:flex">
        <SidebarHeader className="h-16 justify-center">
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
           <SidebarSeparator />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6 md:px-8">
           <div className="hidden md:flex">
             <AppLogo />
           </div>
           {/* On mobile, this will be empty, allowing the right-side items to align correctly */}
           <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
             <ThemeToggle />
             <UserNav />
           </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 pb-24 md:pb-10">
          {children}
        </main>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </PermissionsProvider>
  );
}
    