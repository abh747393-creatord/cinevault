'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconCompass,
  IconMagnifer,
  IconBookmark,
  IconUser,
  IconClapperboardPlay,
  IconBolt,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

export function MobileHeader() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full md:hidden bg-background/90 backdrop-blur-xl border-b border-white/10 flex flex-col">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link href="/" prefetch={true} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
            <IconClapperboardPlay className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-wider text-white">
            CINE<span className="text-primary">VAULT</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/moviebox"
            className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-red-600 to-amber-600 text-white flex items-center gap-1 shadow-sm shadow-red-500/30"
          >
            <IconBolt className="w-3 h-3 text-white" variant="Bold" />
            VIP CINEMA
          </Link>
          <Link href="/search" className="p-1.5 text-slate-300 hover:text-white" aria-label="Search">
            <IconMagnifer className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Quick Category Navigation for Mobile */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto scrollbar-none border-t border-white/5 bg-black/40 text-[11px]">
        <Link
          href="/movies"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
            pathname === '/movies' ? 'bg-primary text-white font-bold' : 'bg-white/5 text-slate-300 hover:text-white'
          )}
        >
          Movies
        </Link>
        <Link
          href="/tv"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
            pathname === '/tv' ? 'bg-primary text-white font-bold' : 'bg-white/5 text-slate-300 hover:text-white'
          )}
        >
          TV Shows
        </Link>
        <Link
          href="/anime"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium',
            pathname === '/anime' ? 'bg-primary text-white font-bold' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          Anime
        </Link>
        <Link
          href="/dramas"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium',
            pathname === '/dramas' ? 'bg-primary text-white font-bold' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          )}
        >
          Dramas
        </Link>
        <Link
          href="/collections"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium',
            pathname.startsWith('/collections') ? 'bg-primary text-white font-bold' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          )}
        >
          Collections
        </Link>
        <Link
          href="/latest"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
            pathname === '/latest' ? 'bg-primary text-white font-bold' : 'bg-white/5 text-slate-300 hover:text-white'
          )}
        >
          Latest
        </Link>
        <Link
          href="/upcoming"
          className={cn(
            'px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
            pathname === '/upcoming' ? 'bg-primary text-white font-bold' : 'bg-white/5 text-slate-300 hover:text-white'
          )}
        >
          Upcoming
        </Link>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const { user } = useAuth();

  const navItems = [
    { label: 'Home', href: '/', icon: IconHome },
    { label: 'VIP Cinema', href: '/moviebox', icon: IconBolt, vip: true },
    { label: 'Browse', href: '/movies', icon: IconCompass },
    { label: 'Search', href: '/search', icon: IconMagnifer },
    { label: 'My List', href: '/my-list', icon: IconBookmark },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch={item.href === '/'}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
              item.vip && !isActive && 'text-amber-400 font-bold',
              item.vip && isActive && 'text-red-400 font-extrabold',
              !item.vip && isActive && 'text-primary font-bold',
              !item.vip && !isActive && 'text-slate-400 hover:text-slate-200'
            )}
            aria-label={item.label}
          >
            <Icon
              className={cn(
                'w-5 h-5 mb-0.5',
                isActive && 'scale-105',
                item.vip && 'text-amber-400'
              )}
              variant={isActive ? 'Bold' : 'Outline'}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
