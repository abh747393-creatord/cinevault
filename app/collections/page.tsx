'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  IconLayers,
  IconClapperboardPlay,
  IconStars,
  IconTV,
  IconMagnifer,
  IconChevronRight,
  IconArrowRight,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FRANCHISE_COLLECTIONS, FranchiseCollection } from '@/lib/data/collections-data';
import { cn } from '@/lib/utils';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<FranchiseCollection[]>(FRANCHISE_COLLECTIONS);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'movies' | 'tv' | 'anime' | 'dramas'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real aggregated collection counts and minimum content filtering
  useEffect(() => {
    let isMounted = true;
    fetch('/api/collections')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.collections) return;
        setCollections(data.collections);
      })
      .catch((err) => {
        console.warn('Could not load live collection counts:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCollections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return collections.filter((col) => {
      const matchCategory =
        selectedCategory === 'all' ||
        col.category === selectedCategory ||
        (selectedCategory === 'tv' && col.mediaType === 'series');

      if (!matchCategory) return false;
      if (!q) return true;

      const nameMatch = col.name.toLowerCase().includes(q);
      const descMatch = col.description.toLowerCase().includes(q);
      const kwMatch = col.keywords?.some((kw) => kw.toLowerCase().includes(q)) ?? false;
      const genreMatch = col.genres?.some((g) => g.toLowerCase().includes(q)) ?? false;
      const searchQueriesMatch = col.searchQueries?.some((sq) => sq.toLowerCase().includes(q)) ?? false;

      return nameMatch || descMatch || kwMatch || genreMatch || searchQueriesMatch;
    });
  }, [collections, selectedCategory, searchQuery]);

  const movieCount = collections.filter((c) => c.category === 'movies').length;
  const tvCount = collections.filter((c) => c.category === 'tv' || c.mediaType === 'series').length;
  const animeCount = collections.filter((c) => c.category === 'anime').length;
  const dramaCount = collections.filter((c) => c.category === 'dramas').length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 select-none">
      {/* Hero Header */}
      <div className="relative w-full py-14 sm:py-20 border-b border-white/10 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <Badge
            variant="accent"
            className="inline-flex items-center gap-1.5 font-bold text-xs py-1 px-3 shadow-lg shadow-accent/20"
          >
            <IconLayers className="w-3.5 h-3.5" />
            DYNAMIC CATEGORY & GENRE DIRECTORY
          </Badge>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
            Curated <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">Collections</span>
          </h1>

          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed px-2">
            Explore K-Dramas, Anime, Marvel, Action Blockbusters, Horror, and Epic Sagas. Every collection dynamically powered by real provider metadata.
          </p>

          {/* Quick Search */}
          <div className="pt-2 max-w-md mx-auto px-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search collections (Marvel, K-Drama, Anime, Horror, Sci-Fi...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-10 text-xs sm:text-sm rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xl transition-all"
              />
              <IconMagnifer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Category Pills Switcher */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto scrollbar-none pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconLayers className="w-3.5 h-3.5" />
            <span>All ({collections.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('movies')}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0',
              selectedCategory === 'movies'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconClapperboardPlay className="w-3.5 h-3.5 text-blue-400" />
            <span>Movies ({movieCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('tv')}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0',
              selectedCategory === 'tv'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconTV className="w-3.5 h-3.5 text-cyan-400" />
            <span>TV & Series ({tvCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('anime')}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0',
              selectedCategory === 'anime'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconStars className="w-3.5 h-3.5 text-amber-400" />
            <span>Anime ({animeCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('dramas')}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0',
              selectedCategory === 'dramas'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconTV className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dramas ({dramaCount})</span>
          </button>
        </div>

        {/* Collections Grid */}
        {filteredCollections.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <IconLayers className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No collections found</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              No collection matching &quot;{searchQuery}&quot;. Try another genre or franchise name.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Reset Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredCollections.map((col) => {
              const categoryBadge =
                col.category === 'movies'
                  ? { label: 'Movie Collection', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }
                  : col.category === 'anime'
                  ? { label: 'Anime Universe', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
                  : col.category === 'dramas'
                  ? { label: 'Drama Anthology', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
                  : { label: 'Series Collection', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };

              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group relative rounded-2xl overflow-hidden bg-card/80 border border-white/10 hover:border-primary/50 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  {/* Banner Image Container */}
                  <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-black">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${col.bannerUrl})`,
                        filter: 'brightness(0.65)',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e17] via-[#0c0e17]/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold border', categoryBadge.color)}>
                        {categoryBadge.label}
                      </span>

                      {col.itemCount !== undefined && col.itemCount > 0 && (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-black/70 backdrop-blur-md text-white border border-white/10">
                          {col.itemCount}+ Titles
                        </span>
                      )}
                    </div>

                    {/* Poster preview */}
                    <div className="absolute -bottom-4 left-4 w-16 h-24 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 z-20 hidden sm:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={col.posterUrl}
                        alt={col.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 pt-3 sm:pl-24 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {col.name}
                        <IconArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                      </h3>

                      <p className="text-xs text-amber-400/90 font-medium italic line-clamp-1">
                        &quot;{col.tagline}&quot;
                      </p>

                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition-colors">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        Explore Collection
                        <IconChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[11px] text-slate-500">Real Provider</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
