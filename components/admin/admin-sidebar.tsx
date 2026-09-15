'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconUsersGroupRounded,
  IconClapperboardPlay,
  IconServer,
  IconClockCircle,
  IconBarChart,
  IconSettings,
  IconArrowRightUp,
  IconChevronRight,
  IconChevronDown,
  IconClose,
  IconShield,
  IconTV,
  IconStars,
} from '@/components/ui/icons';

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  subItems?: { name: string; href: string; icon?: React.ElementType }[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: IconLayoutDashboard,
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: IconUsersGroupRounded,
  },
  {
    name: 'Content Catalog',
    href: '/admin/content',
    icon: IconClapperboardPlay,
    subItems: [
      { name: 'All Catalog', href: '/admin/content' },
      { name: 'Movies', href: '/admin/content/movies', icon: IconClapperboardPlay },
      { name: 'TV Series', href: '/admin/content/tv', icon: IconTV },
      { name: 'Anime', href: '/admin/content/anime', icon: IconStars },
    ],
  },
  {
    name: 'Streaming Providers',
    href: '/admin/providers',
    icon: IconServer,
  },
  {
    name: 'Watch History',
    href: '/admin/watch-history',
    icon: IconClockCircle,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: IconBarChart,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: IconSettings,
  },
];

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [contentOpen, setContentOpen] = useState(pathname.startsWith('/admin/content'));

  const isActive = (href: string) => {
    if (href === '/admin/content') {
      return pathname === '/admin/content';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0a0c10] border-r border-white/10 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <IconShield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white uppercase">CineVault</span>
              <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 text-[9px] font-extrabold uppercase">
                Admin
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Control Center</span>
          </div>
        </Link>

        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Close Navigation"
          >
            <IconClose className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-none">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;

          if (hasSubItems) {
            return (
              <div key={item.name} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setContentOpen(!contentOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary/15 text-primary border border-primary/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {contentOpen ? (
                    <IconChevronDown className="w-3.5 h-3.5 opacity-60" />
                  ) : (
                    <IconChevronRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>

                {contentOpen && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-white/5 ml-4">
                    {item.subItems!.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={onMobileClose}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isSubActive
                              ? 'text-primary bg-primary/10 font-bold'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {SubIcon && <SubIcon className="w-3.5 h-3.5" />}
                          <span>{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer / Live Site */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all border border-white/5"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open Live Site</span>
          </div>
          <IconArrowRightUp className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-slide-in">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
