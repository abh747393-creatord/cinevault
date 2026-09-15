'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHamburgerMenu,
  IconRefresh,
  IconShieldTick,
  IconLogout,
  IconUser,
} from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { RUST_API_BASE } from '@/lib/api/moviebox-client';

interface AdminHeaderProps {
  onMobileMenuToggle: () => void;
}

export function AdminHeader({ onMobileMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [rustStatus, setRustStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [rustLatency, setRustLatency] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    setRustStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch(`${RUST_API_BASE}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setRustStatus('online');
        setRustLatency(elapsed);
      } else {
        const fallback = await fetch(`${RUST_API_BASE}/api/v1/health`, {
          signal: AbortSignal.timeout(2000),
        });
        if (fallback.ok) {
          setRustStatus('online');
          setRustLatency(Math.round(performance.now() - start));
        } else {
          setRustStatus('offline');
          setRustLatency(null);
        }
      }
    } catch {
      setRustStatus('offline');
      setRustLatency(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Poll health every 30s
    return () => clearInterval(interval);
  }, []);

  // Format breadcrumbs
  const pathSegments = pathname
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));

  return (
    <header className="sticky top-0 z-20 h-16 w-full bg-[#0d1017]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 select-none">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 border border-white/10 lg:hidden"
          aria-label="Toggle menu"
        >
          <IconHamburgerMenu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-500">Admin</span>
          {pathSegments.slice(1).map((segment, idx) => (
            <React.Fragment key={idx}>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold">{segment}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right: Engine health & Admin profile */}
      <div className="flex items-center gap-3">
        {/* Rust Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              rustStatus === 'online'
                ? 'bg-emerald-400 animate-pulse'
                : rustStatus === 'checking'
                ? 'bg-amber-400'
                : 'bg-red-400'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px]">
            Rust: {rustStatus === 'online' ? `${rustLatency}ms` : rustStatus}
          </span>
          <button
            type="button"
            onClick={checkHealth}
            disabled={isRefreshing}
            className="p-0.5 text-slate-400 hover:text-white transition-colors"
            title="Refresh status"
          >
            <IconRefresh
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
            />
          </button>
        </div>

        {/* User profile dropdown or badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs uppercase">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || <IconUser className="w-4 h-4" />}
          </div>

          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-white truncate max-w-[130px]">
              {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase flex items-center gap-1">
              <IconShieldTick className="w-2.5 h-2.5" />
              Verified Admin
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <IconLogout className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
