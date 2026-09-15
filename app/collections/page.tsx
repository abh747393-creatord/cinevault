'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  IconLayers,
  IconClapperboardPlay,
  IconStars,
  IconTV,
  IconMagnifer,
  IconChevronRight,
  IconFlame,
  IconArrowRight,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FRANCHISE_COLLECTIONS, FranchiseCollection } from '@/lib/data/collections-data';
import { cn } from '@/lib/utils';

export default function CollectionsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'movies' | 'anime' | 'dramas'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCollections = useMemo(() => {
    return FRANCHISE_COLLECTIONS.filter((col) => {
      const matchCategory = selectedCategory === 'all' || col.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.searchQueries.some((q) => q.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const movieCount = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'movies').length;
  const animeCount = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'anime').length;
  const dramaCount = FRANCHISE_COLLECTIONS.filter((c) => c.category === 'dramas').length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 select-none">
      {/* Hero Header */}
      <div className="relative w-full py-16 sm:py-20 border-b border-white/10 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <Badge
            variant="accent"
            className="inline-flex items-center gap-1.5 font-bold text-xs py-1 px-3 shadow-lg shadow-accent/20"
          >
            <IconLayers className="w-3.5 h-3.5" />
            CINEVAULT FRANCHISE & UNIVERSE DIRECTORY
          </Badge>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
            Curated <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">Collections</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Explore iconic movie universes, legendary anime sagas, and binge-worthy drama collections. Every franchise grouped chronologically with one-click streaming.
          </p>

          {/* Quick Search */}
          <div className="pt-2 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search collections (Marvel, Naruto, K-Drama, Harry Potter...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 text-xs sm:text-sm rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xl transition-all"
              />
              <IconMagnifer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
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
        <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-none pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconLayers className="w-3.5 h-3.5" />
            <span>All Collections ({FRANCHISE_COLLECTIONS.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('movies')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              selectedCategory === 'movies'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconClapperboardPlay className="w-3.5 h-3.5 text-blue-400" />
            <span>Movie Franchises ({movieCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('anime')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              selectedCategory === 'anime'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconStars className="w-3.5 h-3.5 text-amber-400" />
            <span>Anime Universes ({animeCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('dramas')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              selectedCategory === 'dramas'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            )}
          >
            <IconTV className="w-3.5 h-3.5 text-emerald-400" />
            <span>Drama Collections ({dramaCount})</span>
          </button>
        </div>

        {/* Collections Grid */}
        {filteredCollections.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <IconLayers className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No collections found</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              No franchise matching &quot;{searchQuery}&quot;. Try another franchise name.
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
                  ? { label: 'Movie Franchise', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }
                  : col.category === 'anime'
                  ? { label: 'Anime Universe', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
                  : { label: 'Drama Collection', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };

              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group relative rounded-2xl overflow-hidden bg-card/80 border border-white/10 hover:border-primary/50 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  {/* Banner Image Container */}
                  <div className="relative w-full h-48 overflow-hidden bg-black">
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

                      <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-black/70 backdrop-blur-md text-white border border-white/10">
                        {col.itemCount}+ Titles
                      </span>
                    </div>

                    {/* Poster floating preview */}
                    <div className="absolute -bottom-4 left-4 w-16 h-24 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 z-20 hidden sm:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={col.posterUrl}
                        alt={col.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 pt-3 sm:pl-24 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {col.name}
                        <IconArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
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
                      <span className="text-[11px] text-slate-500">1080p Ultra HD</span>
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
