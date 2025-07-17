
"use client";

import { ReactNode } from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { cn } from '@/lib/utils';

export default function TerritoriosLayout({ children }: { children: ReactNode }) {
  // This layout will contain the secondary sidebar for the territories module
  return (
    <div className="flex h-full">
      <aside className="hidden md:flex flex-col w-64 border-r bg-muted/40">
        <SidebarNav isCollapsed={false} />
      </aside>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
