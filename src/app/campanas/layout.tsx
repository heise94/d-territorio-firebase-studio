import type { Metadata, Viewport } from "next";
import { CampaignPwa } from "@/modules/campaigns/components/campaign-pwa";

export const metadata: Metadata = {
  title: "D-Territorio Campañas",
  description: "Organización de campañas especiales de predicación.",
  manifest: "/campanas.webmanifest",
  icons: { apple: "/campanas-icon-192.png", icon: "/campanas-icon-192.png" },
  appleWebApp: { capable: true, title: "Campañas", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0f766e" };

export default function CampaignsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0F172A]">
      <CampaignPwa>{children}</CampaignPwa>
    </div>
  );
}
