'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChevronDown, IconChevronRight, IconTV, IconPlay } from '@/components/ui/icons';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { cn } from '@/lib/utils';

export function DramaDropdown() {
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

  const dramaCollections = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'dramas');
  const isDramaActive = pathname.startsWith('/dramas');

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center">
        <Link
          href="/dramas"
          className={cn(
            'px-2 xl:px-2.5 py-1.5 text-xs xl:text-sm font-medium rounded-l-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1',
            isDramaActive
              ? 'text-white bg-white/15 font-semibold shadow-inner'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          )}
        >
          <IconTV className="w-3.5 h-3.5 text-purple-400" />
          <span>Dramas</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'px-1 py-1.5 text-xs xl:text-sm font-medium rounded-r-lg whitespace-nowrap transition-all duration-150 flex items-center cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none',
            isDramaActive || isOpen
              ? 'text-white bg-white/15 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
          aria-expanded={isOpen}
          aria-label="Toggle Dramas Menu"
        >
          <IconChevronDown
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200',
              isOpen && 'rotate-180 text-purple-400'
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
            {/* Header: Drama Worlds & Collections */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <IconTV className="w-3.5 h-3.5 text-purple-400" />
                Drama Worlds & Collections
              </span>
              <span className="text-[10px] text-purple-400/80 font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                {dramaCollections.length} Collections
              </span>
            </div>

            {/* List of Drama Collections */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
              {dramaCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconPlay className="w-2.5 h-2.5 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0" variant="Bold" />
                    <span className="truncate group-hover:text-white group-hover:font-semibold transition-all">
                      {col.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {col.itemCount}+
                    </span>
                    <IconChevronRight className="w-3 h-3 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Bar: Explore All Dramas */}
            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between px-2">
              <Link
                href="/dramas"
                onClick={() => setIsOpen(false)}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 py-1 transition-colors group"
              >
                <span>Explore All Dramas (K-Drama, Pak, Turkish)</span>
                <IconChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <span className="text-[10px] text-slate-500 font-medium">
                HD & Dual Audio
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
