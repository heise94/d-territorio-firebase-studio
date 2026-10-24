import type { Metadata, Viewport } from "next";
import { CampaignPwa } from "@/modules/campaigns/components/campaign-pwa";

export const metadata: Metadata = {
  manifest: "/campanas.webmanifest",
  icons: { apple: "/campanas-apple-touch-icon.png", icon: "/campanas-icon-192.png" },
  appleWebApp: { capable: true, title: "Exhibidores", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0f766e" };

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return <CampaignPwa>{children}</CampaignPwa>;
}
