'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Film,
  Search,
  Bell,
  User,
  Shield,
  Clock,
  Bookmark,
  LogOut,
  Sparkles,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
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

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Movies', href: '/movies' },
    { label: 'TV Shows', href: '/tv' },
    { label: 'Anime', href: '/anime' },
    { label: 'Trending', href: '/trending' },
    { label: 'Latest', href: '/latest' },
    { label: 'My List', href: '/my-list' },
    { label: 'History', href: '/history' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300 select-none hidden md:block',
        isScrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-white/10 shadow-2xl'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CINE<span className="text-primary font-black">VAULT</span>
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all',
                    isActive
                      ? 'text-white bg-white/10 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Search, Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search titles, actors, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 lg:w-64 h-9 pl-9 pr-4 text-xs rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:w-72 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

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
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-semibold text-white">Notifications</h4>
                  <Badge variant="primary" size="sm">2 New</Badge>
                </div>
                <div className="py-2 space-y-2">
                  <div className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs space-y-1">
                    <p className="text-white font-medium">New Release: Kyoto Blade Season 1</p>
                    <p className="text-slate-400">All 3 episodes are now streaming in 4K with Japanese & English audio.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs space-y-1">
                    <p className="text-white font-medium">Continue Watching</p>
                    <p className="text-slate-400">You were watching Tears of Steel (82% remaining).</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown / Sign in button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full ring-2 ring-primary/40 overflow-hidden bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-scale-up space-y-2">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant={user.role === 'admin' ? 'accent' : 'subtle'} size="sm">
                        {user.role.toUpperCase()}
                      </Badge>
                      <button
                        onClick={() => switchRole(user.role === 'admin' ? 'user' : 'admin')}
                        className="text-[10px] text-primary hover:underline"
                        title="Click to toggle demo role"
                      >
                        (Switch to {user.role === 'admin' ? 'User' : 'Admin'})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Profile & Stats
                    </Link>
                    <Link
                      href="/my-list"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-slate-400" />
                      My Watchlist
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      Watch History
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-400" />
                      Preferences
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-accent" />
                        Admin Dashboard
                      </Link>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        signOut();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
