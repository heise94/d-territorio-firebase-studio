import type { Metadata, Viewport } from "next";
import { CampaignPwa } from "@/modules/campaigns/components/campaign-pwa";

export const metadata: Metadata = {
  title: "Unirse a Campaña exhibidores",
  applicationName: "Campaña exhibidores",
  description: "Crea tu cuenta para participar en una campaña especial de predicación.",
  manifest: "/unirse.webmanifest",
  icons: { apple: "/campanas-apple-touch-icon.png", icon: "/campanas-icon-192.png" },
  appleWebApp: { capable: true, title: "Exhibidores", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[var(--campaign-background)] text-[var(--campaign-ink)]">
      <CampaignPwa>{children}</CampaignPwa>
    </div>
  );
}
