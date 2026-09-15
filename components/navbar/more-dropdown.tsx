'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconChevronDown,
  IconFlame,
  IconStars,
  IconCalendar,
  IconBookmark,
  IconClockCircle,
  IconMore2,
  IconChevronRight,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export function MoreDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const moreLinks = [
    { label: 'Trending Now', href: '/trending', icon: IconFlame, color: 'text-amber-500' },
    { label: 'Latest Releases', href: '/latest', icon: IconStars, color: 'text-blue-400' },
    { label: 'Upcoming Movies', href: '/upcoming', icon: IconCalendar, color: 'text-emerald-400' },
    { label: 'My Watchlist', href: '/my-list', icon: IconBookmark, color: 'text-primary' },
    { label: 'Watch History', href: '/history', icon: IconClockCircle, color: 'text-slate-400' },
  ];

  const isMoreActive = moreLinks.some((l) => pathname === l.href);

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1 cursor-pointer',
          isMoreActive || isOpen
            ? 'text-white bg-white/15 font-semibold shadow-inner'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        )}
        aria-expanded={isOpen}
      >
        <IconMore2 className="w-4 h-4 text-slate-400" />
        <span>More</span>
        <IconChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-white'
          )}
        />
      </button>

      {/* Dropdown Menu with Hover Bridge */}
      {isOpen && (
        <div
          className="absolute top-full left-0 pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Invisible hover bridge */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />

          <div className="w-56 bg-[#090b12] border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-2 z-50 space-y-0.5">
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-1">
              Explore More
            </div>

            {moreLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    isActive
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('w-4 h-4', item.color)} />
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {item.label}
                    </span>
                  </div>
                  <IconChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
