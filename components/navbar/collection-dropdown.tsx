'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChevronDown, IconChevronRight, IconLayers, IconClapperboardPlay, IconPlay } from '@/components/ui/icons';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { cn } from '@/lib/utils';

export function CollectionDropdown() {
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
    // 300ms grace timeout so user can comfortably glide mouse without accidental closing
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

  const movieCollections = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'movies');
  const isCollectionsActive = pathname.startsWith('/collections');

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
          isCollectionsActive || isOpen
            ? 'text-white bg-white/15 font-semibold shadow-inner'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        )}
        aria-expanded={isOpen}
      >
        <IconLayers className="w-3.5 h-3.5 text-red-500" />
        <span>Collection</span>
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
          {/* Invisible hover bridge to eliminate mouseleave gap */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />

          <div className="w-80 sm:w-88 bg-[#090b12] border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-2.5 z-50">
            {/* Header: Movie Collections */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <IconClapperboardPlay className="w-3.5 h-3.5 text-red-500" />
                Movie Franchises & Universes
              </span>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                {movieCollections.length} Universes
              </span>
            </div>

            {/* List of Movie Franchise Collections (MultiMovies Style with Red Triangle) */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
              {movieCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconPlay className="w-2.5 h-2.5 text-red-500 group-hover:translate-x-0.5 transition-transform" variant="Bold" />
                    <span className="truncate group-hover:text-white group-hover:font-semibold transition-all">
                      {col.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {col.itemCount !== undefined && col.itemCount > 0 ? `${col.itemCount}+` : 'Explore'}
                    </span>
                    <IconChevronRight className="w-3 h-3 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Bar: Explore All Collections */}
            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between px-2">
              <Link
                href="/collections"
                onClick={() => setIsOpen(false)}
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 py-1 transition-colors group"
              >
                <span>Explore All Movie Collections</span>
                <IconChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <span className="text-[10px] text-slate-500 font-medium">
                4K & 1080p
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
