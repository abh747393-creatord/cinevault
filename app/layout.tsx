import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-context';
import { DesktopNav } from '@/components/navbar/desktop-nav';
import { MobileHeader, MobileBottomNav } from '@/components/navbar/mobile-nav';
import { ConsumerFooter } from '@/components/navbar/consumer-footer';

export const metadata: Metadata = {
  title: 'CineVault | Modern Movie & TV Streaming Discovery',
  description: 'A modern, responsive movie and TV streaming discovery web platform built with Next.js, TypeScript, and Supabase.',
  keywords: ['streaming', 'movies', 'tv shows', 'anime', 'cinevault', 'supabase'],
  openGraph: {
    title: 'CineVault | Modern Movie & TV Streaming Discovery',
    description: 'Cinematic streaming discovery and HTML5 video playback platform.',
    type: 'website',
  },
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" translate="no" className="dark notranslate">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary selection:text-white notranslate">
        <AuthProvider>
          <DesktopNav />
          <MobileHeader />

          <main className="flex-1 pb-16 md:pb-0">{children}</main>

          <ConsumerFooter />

          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
