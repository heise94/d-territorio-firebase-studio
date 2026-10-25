"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const isAccessRoute = pathname === "/campanas/admin/acceso";

  useEffect(() => {
    let active = true;
    if (isAccessRoute) {
      setAllowed(true);
      return;
    }
    if (!user) {
      setAllowed(false);
      return;
    }
    void user.getIdTokenResult().then((result) => {
      if (!active) return;
      const claims = result.claims as Record<string, unknown>;
      // Participant administrators are sent straight to their permitted
      // campaign, never to the platform-wide page where campaigns are made.
      if (claims.campaign_participant_admin === true && pathname === "/campanas/admin") {
        router.replace("/campanas/admin/acceso");
        return;
      }
      setAllowed(claims.campaign_admin === true || claims.super_admin === true);
    }).catch(() => active && setAllowed(false));
    return () => { active = false; };
  }, [isAccessRoute, pathname, router, user]);

  useEffect(() => {
    if (!isAccessRoute && !loading && allowed === false)
      router.replace("/campanas/ingresar?modo=administracion");
  }, [allowed, isAccessRoute, loading, router]);

  if (isAccessRoute) return <>{children}</>;
  if (loading || allowed !== true)
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-700" /></div>;
  return <>{children}</>;
}

export default function CampaignAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
