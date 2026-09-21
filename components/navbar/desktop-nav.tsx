'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconClapperboardPlay,
  IconMagnifer,
  IconBell,
  IconUser,
  IconShield,
  IconClockCircle,
  IconBookmark,
  IconLogout,
  IconStars,
  IconSettings,
  IconChevronDown,
  IconMoonStars,
} from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { CollectionDropdown } from './collection-dropdown';
import { AnimeDropdown } from './anime-dropdown';
import { DramaDropdown } from './drama-dropdown';
import { MoreDropdown } from './more-dropdown';

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const { user, signOut, switchRole } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      import('@/lib/api/moviebox-client').then(({ movieboxApi }) => {
        movieboxApi.suggest(q).then((sug) => {
          setSuggestions(sug || []);
        }).catch(() => setSuggestions([]));
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const primaryNavLinks = [
    { label: 'Home', href: '/' },
    { label: 'VIP Cinema', href: '/moviebox', vip: true },
    { label: 'Movies', href: '/movies' },
    { label: 'TV Shows', href: '/tv' },
  ];


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const isHome = pathname === '/';
  const isHeaderSolid = isScrolled || !isHome;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-200 select-none hidden md:block',
        isHeaderSolid
          ? 'bg-[#07080d]/98 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
          : 'bg-gradient-to-b from-[#07080d]/95 via-[#07080d]/70 to-transparent backdrop-blur-sm'
      )}
    >
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-3 lg:gap-4">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-3 xl:gap-5 min-w-0 flex-1">
          <Link href="/" prefetch={true} className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              <IconClapperboardPlay className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg xl:text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CINE<span className="text-primary font-black">VAULT</span>
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-0.5 xl:gap-1 min-w-0 flex-nowrap">
            {primaryNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.href === '/'}
                  className={cn(
                    'px-2 py-1.5 text-xs xl:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1',
                    link.vip && 'bg-gradient-to-r from-red-600/20 to-amber-500/20 text-amber-300 border border-red-500/30 font-bold hover:bg-red-600/30 shadow-sm',
                    isActive
                      ? link.vip
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold shadow-md shadow-red-600/30'
                        : 'text-white bg-white/15 font-semibold shadow-inner'
                      : !link.vip && 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.vip && <IconStars className="w-3 h-3 text-amber-400" />}
                  {link.label}
                </Link>
              );
            })}

            {/* Movie Collections Dropdown */}
            <CollectionDropdown />

            {/* Anime Dropdown */}
            <AnimeDropdown />

            {/* Dramas Dropdown */}
            <DramaDropdown />

            {/* Midnight Link */}
            <Link
              href="/midnight"
              prefetch={false}
              className={cn(
                'px-2 py-1.5 text-xs xl:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1.5',
                pathname === '/midnight'
                  ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10'
              )}
            >
              <IconMoonStars className="w-3.5 h-3.5 text-indigo-400" />
              Midnight
            </Link>

            {/* Trending Quick Link */}
            <Link
              href="/trending"
              prefetch={false}
              className={cn(
                'px-2 py-1.5 text-xs xl:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 items-center gap-1 hidden lg:flex',
                pathname === '/trending'
                  ? 'text-white bg-white/15 font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              Trending
            </Link>

            {/* More Dropdown (Latest, Upcoming, My List, History) */}
            <MoreDropdown />
          </nav>
        </div>

        {/* Search, Notifications & User Menu */}
        <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
          {/* Quick Search */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-28 sm:w-36 xl:w-48 h-8 pl-8 pr-2.5 text-xs rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:w-56 transition-all duration-300"
              />
              <IconMagnifer className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            {/* Live Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute left-0 mt-2 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-scale-up space-y-1"
                onMouseLeave={() => setShowSuggestions(false)}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-white/10">
                  <IconStars className="w-3 h-3 text-amber-400" />
                  Live Suggestions
                </div>
                {suggestions.slice(0, 6).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors group focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span className="truncate">{term}</span>
                    <IconMagnifer className="w-3 h-3 text-slate-500 group-hover:text-primary shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Admin Access */}
          {user?.role === 'admin' && user?.email?.trim().toLowerCase() === 'abh747393@gmail.com' && (
            <Link
              href="/admin/dashboard"
              prefetch={false}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-bold transition-all shadow-sm"
              title="CineVault Super Admin Dashboard"
            >
              <IconShield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-slate-300 hover:text-white"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              aria-label="Notifications"
            >
              <IconBell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-semibold text-white">Notifications</h4>
                  <Badge variant="outline" size="sm">System</Badge>
                </div>
                <div className="py-4 text-center space-y-1">
                  <p className="text-xs text-slate-300 font-medium">All systems operational</p>
                  <p className="text-[11px] text-slate-500">You are up to date with the latest streams.</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown (Only for signed in accounts) */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full ring-2 ring-primary/40 overflow-hidden bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </div>
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-scale-up space-y-2">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    {user.role === 'admin' && user.email?.trim().toLowerCase() === 'abh747393@gmail.com' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="accent" size="sm">
                          ADMINISTRATOR
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {user.role === 'admin' && user.email?.trim().toLowerCase() === 'abh747393@gmail.com' && (
                      <Link
                        href="/admin/dashboard"
                        prefetch={false}
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
                      >
                        <IconShield className="w-4 h-4 text-accent" />
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      href="/my-list"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <IconBookmark className="w-4 h-4 text-slate-400" />
                      My Watchlist
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <IconClockCircle className="w-4 h-4 text-slate-400" />
                      Watch History
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <IconSettings className="w-4 h-4 text-slate-400" />
                      Preferences
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <IconLogout className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
