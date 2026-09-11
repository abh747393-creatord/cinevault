'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Search, Bookmark, User, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 w-full md:hidden bg-background/90 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
          <Film className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-black tracking-wider text-white">
          CINE<span className="text-primary">VAULT</span>
        </span>
      </Link>
      <Link href="/search" className="p-2 text-slate-300 hover:text-white" aria-label="Search">
        <Search className="w-5 h-5" />
      </Link>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Browse', href: '/movies', icon: Compass },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'My List', href: '/my-list', icon: Bookmark },
    { label: 'Profile', href: user ? '/profile' : '/login', icon: User },
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
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive && 'stroke-[2.5px] text-primary')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
