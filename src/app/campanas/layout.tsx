import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaña exhibidores",
  applicationName: "Campaña exhibidores",
  description: "Organización de campañas especiales de predicación.",
  // Also clear the generic manifest inherited from the application root.
  manifest: null,
};

export default function CampaignsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[var(--campaign-background)] text-[var(--campaign-ink)]">
      {children}
    </div>
  );
}
