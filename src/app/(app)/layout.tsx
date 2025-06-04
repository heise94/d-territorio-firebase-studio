"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Menu } from 'lucide-react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserNav } from '@/components/layout/user-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PermissionsProvider, usePermissions } from '@/hooks/use-permissions';

function AuthenticatedLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoadingPermissions } = usePermissions(); 
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoadingPermissions || !user) {
    // Added !user check to ensure loader shows until user object is confirmed
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

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
          <div className="flex h-16 items-center border-b px-6 shrink-0">
            <AppLogo href="/dashboard" />
          </div>
          <SidebarNav />
           <div className="mt-auto p-4 border-t">
            <p className="text-xs text-sidebar-foreground/60 text-center">
                &copy; {new Date().getFullYear()} D-TERRITORIO
            </p>
          </div>
        </SheetContent>
      </Sheet>


      <div className="flex flex-1 flex-col md:ml-72 lg:ml-72"> {/* Adjust margin to account for fixed sidebar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
          {/* Mobile: Space for menu trigger. Desktop: UserNav is on the right */}
           <div className="flex-1 md:hidden">
             {/* Intentionally empty or for breadcrumbs later */}
           </div>
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
