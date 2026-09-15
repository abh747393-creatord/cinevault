'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChevronDown, IconChevronRight, IconStars, IconPlay } from '@/components/ui/icons';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { cn } from '@/lib/utils';

export function AnimeDropdown() {
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
    // 300ms grace timeout
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

  const animeCollections = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'anime');
  const isAnimeActive = pathname.startsWith('/anime');

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center">
        <Link
          href="/anime"
          className={cn(
            'px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-medium rounded-l-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1',
            isAnimeActive
              ? 'text-white bg-white/15 font-semibold shadow-inner'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          )}
        >
          <IconStars className="w-3.5 h-3.5 text-amber-400" />
          <span>Anime</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'px-1 py-1.5 text-xs xl:text-sm font-medium rounded-r-lg whitespace-nowrap transition-all duration-150 flex items-center cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none',
            isAnimeActive || isOpen
              ? 'text-white bg-white/15 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
          aria-expanded={isOpen}
          aria-label="Toggle Anime Menu"
        >
          <IconChevronDown
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200',
              isOpen && 'rotate-180 text-amber-400'
            )}
          />
        </button>
      </div>

      {/* Dropdown Menu with Hover Bridge */}
      {isOpen && (
        <div
          className="absolute top-full left-0 pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Invisible hover bridge */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />

          <div className="w-80 sm:w-88 bg-[#090b12] border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-2.5 z-50">
            {/* Header: Popular Anime Universes */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <IconStars className="w-3.5 h-3.5 text-amber-400" />
                Popular Anime Universes
              </span>
              <span className="text-[10px] text-amber-400/80 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                {animeCollections.length} Universes
              </span>
            </div>

            {/* List of Anime Collections */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
              {animeCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconPlay className="w-2.5 h-2.5 text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" variant="Bold" />
                    <span className="truncate group-hover:text-white group-hover:font-semibold transition-all">
                      {col.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {col.itemCount}+
                    </span>
                    <IconChevronRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Bar: Explore All Anime */}
            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between px-2">
              <Link
                href="/anime"
                onClick={() => setIsOpen(false)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 py-1 transition-colors group"
              >
                <span>Explore All Anime (Series & Movies)</span>
                <IconChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <span className="text-[10px] text-slate-500 font-medium">
                Dual Audio & Sub
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
