
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppAuthProvider } from '@/components/app-auth-provider';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/hooks/use-theme';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'D-TERRITORIO',
  description: 'Gestión integral de territorios de predicación.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#34D399',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        <ThemeProvider>
          <AppAuthProvider>
            {children}
            <Toaster />
          </AppAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
