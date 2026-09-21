'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  IconBolt, 
  IconRefresh, 
  IconLayers, 
  IconRadio, 
  IconMagnifer, 
  IconFlame, 
  IconClapperboardPlay, 
  IconTV,
} from '@/components/ui/icons';
import { movieboxApi, MovieBoxCatalogItem, BrowseMetrics } from '@/lib/api/moviebox-client';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';

export default function MovieBoxHubPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all');
  const [items, setItems] = useState<MovieBoxCatalogItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, BrowseMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieBoxCatalogItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [engineHealth, setEngineHealth] = useState<{ status: string; version: string; providers: string[] } | null>(null);

  // Fetch backend engine health
  useEffect(() => {
    movieboxApi.health()
      .then((h) => setEngineHealth(h))
      .catch(() => setEngineHealth(null));
  }, []);

  // Fetch tab catalog items
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSearchResults(null);

    movieboxApi.homepage(activeTab, 1)
      .then((data) => {
        if (!isMounted) return;
        setItems(data.items || []);
        setMetrics(data.metrics || {});
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load CineVault VIP catalog:', err);
        setError('Could not connect to CineVault VIP gateway. Please ensure gateway service is running.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Handle live search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await movieboxApi.search(q);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const displayedList = searchResults !== null ? searchResults : items;
  // Map to ContentItem for cards
  const mappedContentItems: ContentItem[] = React.useMemo(() => {
    return displayedList.map((it) => {
      const rawId = it.id.value;
      const isSeries = it.media_type === 'series';
      const ratingVal = metrics[rawId]?.rating ? Number(metrics[rawId].rating) : undefined;
      const yearVal = it.year ? parseInt(it.year, 10) || 2024 : 2024;

      return {
        id: `mb-${rawId}`,
        externalId: rawId,
        title: it.title,
        slug: `mb-${rawId}`,
        contentType: isSeries ? 'tv' : 'movie',
        posterUrl: it.poster_url || '/images/neutral-poster.svg',
        backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
        description: `${it.title} (${it.year || 'Feature'}) - CineVault High Definition Stream`,
        releaseDate: it.year ? `${it.year}-01-01` : '',
        year: yearVal,
        rating: ratingVal,
        genres: [{ id: 'g-vip', name: 'CineVault VIP', slug: 'vip' }],
        language: 'English',
        status: 'released',
      };
    });
  }, [displayedList, engineHealth, metrics]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* CineVault VIP Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/60 via-purple-950/40 to-background border border-red-500/20 mx-4 sm:mx-6 md:mx-12 mt-4 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/30 flex items-center gap-1.5">
                <IconBolt className="w-3.5 h-3.5 text-white" variant="Bold" />
                CINEVAULT VIP
              </span>

              {engineHealth ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Engine Online (v{engineHealth.version})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <IconRefresh className="w-3 h-3 animate-spin" />
                  Checking Gateway...
                </span>
              )}

              <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hidden sm:inline-flex items-center gap-1.5">
                <IconLayers className="w-3 h-3 text-primary" />
                Multi-CDN & Multi-Res HEVC
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              CineVault <span className="bg-gradient-to-r from-red-400 via-amber-300 to-white bg-clip-text text-transparent">Ultra Stream</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Stream movies and TV series directly in 1080p, 4K, and Multi-Res formats with ultra-fast CDN mirrors, HTTP 206 range seeking, and dynamic multi-language audio dubs.
            </p>
          </div>

          {/* Quick Stats or Active Providers Pill */}
          {engineHealth && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0 min-w-[240px]">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <IconRadio className="w-3.5 h-3.5 text-emerald-400" />
                Active Streaming Nodes
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {engineHealth.providers.map((p) => (
                  <span
                    key={p}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                      p === 'moviebox'
                        ? 'bg-red-500/20 text-amber-300 border border-red-500/40 font-black'
                        : 'bg-white/5 text-slate-300 border border-white/10'
                    }`}
                  >
                    {p === 'moviebox' ? 'CINEVAULT ULTRA' : p.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Search Form */}
        <form onSubmit={handleSearch} className="mt-8 relative max-w-2xl">
          <div className="relative flex items-center">
            <IconMagnifer className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim() && searchResults !== null) {
                  setSearchResults(null);
                }
              }}
              placeholder="Search CineVault catalog (e.g. Mayday, Odyssey, Spider-Man, Inception)..."
              className="w-full h-12 sm:h-14 pl-12 pr-28 text-sm sm:text-base rounded-2xl bg-black/60 hover:bg-black/70 focus:bg-black/80 border border-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={searching}
              className="absolute right-2 h-8 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20"
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchResults(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'all' && searchResults === null
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <IconFlame className="w-4 h-4 text-amber-400" />
              Trending All
            </button>

            <button
              onClick={() => {
                setActiveTab('movie');
                setSearchResults(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'movie' && searchResults === null
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <IconClapperboardPlay className="w-4 h-4 text-blue-400" />
              Movies
            </button>

            <button
              onClick={() => {
                setActiveTab('tv');
                setSearchResults(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'tv' && searchResults === null
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <IconTV className="w-4 h-4 text-purple-400" />
              TV Shows & Series
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {searchResults !== null ? (
              <span>Found {searchResults.length} search results</span>
            ) : (
              <span>Showing {displayedList.length} titles from CineVault CDN</span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Connecting to CineVault Gateway...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-16 text-center space-y-4 bg-red-950/20 border border-red-500/20 rounded-2xl p-8 max-w-md mx-auto">
            <IconRadio className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">CineVault Gateway Offline</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab(activeTab)}
              className="bg-red-600 hover:bg-red-500"
            >
              Retry Connection
            </Button>
          </div>
        )}

        {/* Catalog Grid */}
        {!loading && !error && (
          <>
            {mappedContentItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {mappedContentItems.map((item) => (
                  <ContentCard key={item.id} content={item} className="w-full" />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <IconClapperboardPlay className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No titles found</h3>
                <p className="text-xs text-slate-400">
                  {searchResults !== null
                    ? `No results found for "${searchQuery}". Try another keyword.`
                    : 'No titles returned from this category.'}
                </p>
                {searchResults !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchResults(null);
                      setSearchQuery('');
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
