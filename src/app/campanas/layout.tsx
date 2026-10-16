import type { Metadata, Viewport } from "next";
import { CampaignPwa } from "@/modules/campaigns/components/campaign-pwa";

export const metadata: Metadata = {
  title: "Campaña exhibidores",
  applicationName: "Campaña exhibidores",
  description: "Organización de campañas especiales de predicación.",
  manifest: "/campanas.webmanifest",
  icons: { apple: "/campanas-apple-touch-icon.png", icon: "/campanas-icon-192.png" },
  appleWebApp: { capable: true, title: "Exhibidores", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0f766e" };

export default function CampaignsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[var(--campaign-background)] text-[var(--campaign-ink)]">
      <CampaignPwa>{children}</CampaignPwa>
    </div>
  );
}
