
"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Menu, XCircle } from 'lucide-react'; 
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserNav } from '@/components/layout/user-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'; // Added SheetHeader, SheetTitle
import { PermissionsProvider, usePermissions } from '@/hooks/use-permissions';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { 
    userProfile, 
    isLoadingPermissions, 
    isImpersonating, 
    stopImpersonation 
  } = usePermissions(); 
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
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
    <div className="flex min-h-screen w-full bg-muted/30 dark:bg-muted/10">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 lg:w-72 flex-col border-r bg-sidebar fixed h-full z-40">
        <div className="flex h-16 items-center border-b px-6 shrink-0 bg-sidebar">
          <AppLogo href="/dashboard" />
        </div>
        <SidebarNav />
         <div className="mt-auto p-4 border-t">
            <p className="text-xs text-sidebar-foreground/60 text-center">
                &copy; {new Date().getFullYear()} D-TERRITORIO
            </p>
        </div>
      </aside>

      {/* Mobile Sidebar */}
       <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50 bg-background/80 backdrop-blur-sm">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 md:hidden w-72 bg-sidebar">
          <SheetHeader className="flex h-16 items-center border-b px-6 shrink-0">
            <AppLogo href="/dashboard" />
            {/* Added SheetTitle for accessibility, though AppLogo is visually the header.
                It can be visually hidden if needed using Radix VisuallyHidden,
                but for now, a simple, possibly visually redundant title is better than none.
                Alternatively, AppLogo itself could be wrapped or provide an aria-label.
            */}
            <SheetTitle className="sr-only">Menú Principal</SheetTitle>
          </SheetHeader>
          <SidebarNav />
           <div className="mt-auto p-4 border-t">
            <p className="text-xs text-sidebar-foreground/60 text-center">
                &copy; {new Date().getFullYear()} D-TERRITORIO
            </p>
          </div>
        </SheetContent>
      </Sheet>


      <div className="flex flex-1 flex-col md:ml-72 lg:ml-72">
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
           <div className="flex-1 md:hidden">
           </div>
           <ThemeToggle />
          <UserNav />
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10">
          {children}
        </main>
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
