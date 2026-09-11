import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-context';
import { DesktopNav } from '@/components/navbar/desktop-nav';
import { MobileHeader, MobileBottomNav } from '@/components/navbar/mobile-nav';
import Link from 'next/link';
import { Film, Github, Shield, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CineVault | Modern Movie & TV Streaming Discovery',
  description: 'A modern, responsive movie and TV streaming discovery web platform built with Next.js, TypeScript, and Supabase.',
  keywords: ['streaming', 'movies', 'tv shows', 'anime', 'cinevault', 'supabase'],
  openGraph: {
    title: 'CineVault | Modern Movie & TV Streaming Discovery',
    description: 'Cinematic streaming discovery and HTML5 video playback platform.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        <AuthProvider>
          <DesktopNav />
          <MobileHeader />

          <main className="flex-1 pb-16 md:pb-0">{children}</main>

          <footer className="w-full bg-black/60 border-t border-white/10 py-10 px-6 mt-16 select-none hidden md:block">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
                  <Film className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-extrabold tracking-wider text-white">
                    CINE<span className="text-primary">VAULT</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Next-Gen Streaming Platform with Modular Provider Architecture
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-400">
                <Link href="/movies" className="hover:text-white transition-colors">
                  Movies
                </Link>
                <Link href="/tv" className="hover:text-white transition-colors">
                  TV Shows
                </Link>
                <Link href="/anime" className="hover:text-white transition-colors">
                  Anime
                </Link>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Preferences
                </Link>
                <Link href="/admin" className="hover:text-accent transition-colors flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span>Public Domain & Open License Cinema Catalog</span>
              </div>
            </div>
          </footer>

          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
