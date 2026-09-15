'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconClapperboardPlay } from '@/components/ui/icons';

export function ConsumerFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="w-full bg-black/60 border-t border-white/10 py-10 px-6 mt-16 select-none hidden md:block">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
            <IconClapperboardPlay className="w-4 h-4 text-white" />
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
          <Link href="/history" className="hover:text-white transition-colors">
            Watch History
          </Link>
          <Link href="/settings" className="hover:text-white transition-colors">
            Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
