'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PermissionsProvider, usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';
import { PERMISSIONS } from '@/lib/constants';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isLoadingPermissions, hasPermission } = usePermissions();
  const allowed = hasPermission(PERMISSIONS.MANAGE_CAMPAIGNS);
  useEffect(() => { if (!loading && !isLoadingPermissions && (!user || !allowed)) router.replace('/?adminLogin=1'); }, [allowed, isLoadingPermissions, loading, router, user]);
  if (loading || isLoadingPermissions || !user || !allowed) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-700" /></div>;
  return <>{children}</>;
}

export default function CampaignAdminLayout({ children }: { children: React.ReactNode }) {
  return <PermissionsProvider><AdminGuard>{children}</AdminGuard></PermissionsProvider>;
}
