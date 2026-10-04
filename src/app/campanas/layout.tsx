import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'D-Territorio Campañas',
  description: 'Organización de campañas especiales de predicación.',
};

export default function CampaignsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0F172A]">
      {children}
    </div>
  );
}
