'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { WatchHistoryItem } from '@/types/user';
import { getStoredHistory } from '@/lib/storage/local-storage-store';
import { ContinueWatchingCard } from '@/components/cards/continue-watching-card';
import { useAuth } from '@/lib/auth/auth-context';

export function ContinueWatchingRow() {
  const { user } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load watch history
    const list = getStoredHistory();
    // Filter uncompleted items
    const uncompleted = list.filter((h) => !h.completed && h.positionSeconds > 5);
    setHistory(uncompleted);
  }, [user]);

  const handleRemove = (contentId: string) => {
    setHistory((prev) => prev.filter((h) => h.contentId !== contentId));
  };

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!user || history.length === 0) return null;

  return (
    <section className="relative py-4 group select-none">
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 mb-3">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-primary" />
          Continue Watching
        </h3>
        <Link
          href="/history"
          className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          View All History
        </Link>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          ref={rowRef}
          className="flex items-start gap-4 overflow-x-auto scrollbar-none px-4 sm:px-6 md:px-12 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.map((item) => (
            <ContinueWatchingCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
