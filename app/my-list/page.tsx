'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { IconBookmark, IconTrash, IconArrowRight } from '@/components/ui/icons';
import { WatchlistItem } from '@/types/user';
import { getStoredWatchlist, removeFromWatchlist } from '@/lib/storage/local-storage-store';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { ContentType } from '@/types/content';

export default function MyListPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | ContentType>('all');

  useEffect(() => {
    setWatchlist(getStoredWatchlist());
  }, []);

  const handleRemove = (contentId: string) => {
    const updated = removeFromWatchlist(contentId);
    setWatchlist(updated);
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return watchlist;
    return watchlist.filter((item) => item.content.contentType === activeTab);
  }, [watchlist, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <IconBookmark className="w-7 h-7 text-primary" />
            My Watchlist
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Titles you have saved to watch later.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('movie')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'movie' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tv' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            TV Shows
          </button>
          <button
            onClick={() => setActiveTab('anime')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'anime' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Anime
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative group/item">
              <ContentCard content={item.content} className="w-full" />
              <button
                onClick={() => handleRemove(item.contentId)}
                className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/70 hover:bg-accent text-slate-300 hover:text-white backdrop-blur-md opacity-0 group-hover/item:opacity-100 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Remove from My List"
                aria-label="Remove from My List"
              >
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 bg-white/5 rounded-2xl border border-white/5 max-w-md mx-auto">
          <IconBookmark className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Your list is currently empty</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Discover movies and TV series across our catalog and tap &ldquo;+ Add to List&rdquo; to build your personal queue.
          </p>
          <Link href="/movies">
            <Button variant="primary" size="sm" className="gap-2">
              Browse Movies
              <IconArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
