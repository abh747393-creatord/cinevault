'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  IconFlame,
  IconPlay,
  IconInfoCircle,
  IconTV,
  IconMagnifer,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { TOP_DRAMA_QUERIES } from '@/lib/data/collections-data';
import { deduplicateAndCleanCatalog, getCanonicalTitle } from '@/lib/utils/content-filter';

export default function DramasPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dramasList, setDramasList] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const dramaCategories = [
    { label: 'All Dramas', value: 'all' },
    { label: '🔥 Global Hits', value: 'hits' },
    { label: '🇰🇷 K-Drama', value: 'kdrama' },
    { label: '🇵🇰 Pakistani Hits', value: 'pakistani' },
    { label: '🇹🇷 Turkish Dizi', value: 'turkish' },
    { label: '💕 Romance & Love', value: 'romance' },
    { label: '👑 Historical & Dynasty', value: 'historical' },
    { label: '🕵️ Crime & Revenge', value: 'thriller' },
  ];

  // Map raw MovieBox catalog items into CineVault ContentItem objects
  const mapToContentItem = (it: MovieBoxCatalogItem): ContentItem => {
    const rawId = it.id.value;
    const isSeries = it.media_type === 'series';
    const titleLower = it.title.toLowerCase();
    const hasHindi = titleLower.includes('hindi');
    const isKdrama =
      titleLower.includes('squid') ||
      titleLower.includes('queen') ||
      titleLower.includes('tears') ||
      titleLower.includes('crash') ||
      titleLower.includes('glory') ||
      titleLower.includes('vincenzo') ||
      titleLower.includes('beauty') ||
      titleLower.includes('dead') ||
      titleLower.includes('kingdom') ||
      titleLower.includes('proposal');
    const isPakistani =
      titleLower.includes('bin') ||
      titleLower.includes('parizaad') ||
      titleLower.includes('tum') ||
      titleLower.includes('humsafar') ||
      titleLower.includes('paas');
    const isTurkish =
      titleLower.includes('ertugrul') ||
      titleLower.includes('osman') ||
      titleLower.includes('yargi') ||
      titleLower.includes('kapimi');

    const genres = [{ id: 'g-drama', name: 'Drama', slug: 'drama' }];
    if (isKdrama) genres.push({ id: 'g-kdrama', name: 'K-Drama', slug: 'k-drama' });
    if (isPakistani) genres.push({ id: 'g-pak', name: 'Pakistani Drama', slug: 'pakistani' });
    if (isTurkish) genres.push({ id: 'g-turk', name: 'Turkish Drama', slug: 'turkish' });

    const availableAudio = hasHindi
      ? ['Hindi (Dub)', 'Original Audio', 'English (Sub)']
      : ['Original Audio', 'English (Sub)'];

    const cleanTitle = getCanonicalTitle(it.title);

    return {
      id: `mb-${rawId}`,
      externalId: rawId,
      title: cleanTitle || it.title,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl: it.poster_url || '/images/neutral-poster.svg',
      backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
      description: `${cleanTitle || it.title} (${it.year || 'Drama Series'})`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      genres,
      status: 'released',
      language: isPakistani ? 'Urdu' : isTurkish ? 'Turkish' : isKdrama ? 'Korean' : 'Multi',
      availableAudio,
      availableSubtitles: ['English', 'Urdu', 'Hindi'],
    };
  };

  // Initial load: Fetch top dramas across Asian, Korean, Pakistani, and Turkish catalogs
  useEffect(() => {
    let isMounted = true;
    async function loadDramas() {
      try {
        setLoading(true);
        const searchPromises = TOP_DRAMA_QUERIES.slice(0, 12).map((query) =>
          movieboxApi.search(query).catch(() => [])
        );

        const resultsArrays = await Promise.all(searchPromises);
        if (!isMounted) return;

        const flattened = resultsArrays.flat();

        // Strictly clean out adult/mockbuster content and deduplicate
        const cleaned = deduplicateAndCleanCatalog(flattened);
        const uniqueItems = cleaned.map(mapToContentItem);

        setDramasList(uniqueItems);
      } catch (err) {
        console.error('Failed to load drama items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDramas();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle live search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await movieboxApi.search(query);
      const cleaned = deduplicateAndCleanCatalog(results);
      const mapped = cleaned.map(mapToContentItem);
      setSearchResults(mapped);
    } catch (err) {
      console.error('Drama search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Filter items based on selected category pill
  const activeItems = searchResults || dramasList;

  const filteredDramas = useMemo(() => {
    if (selectedCategory === 'all') return activeItems;

    return activeItems.filter((item) => {
      const titleLower = item.title.toLowerCase();
      if (selectedCategory === 'hits') {
        return (item.rating !== undefined && item.rating >= 9.3) || titleLower.includes('squid') || titleLower.includes('queen') || titleLower.includes('bin');
      }
      if (selectedCategory === 'kdrama') {
        return (
          titleLower.includes('squid') ||
          titleLower.includes('queen') ||
          titleLower.includes('tears') ||
          titleLower.includes('crash') ||
          titleLower.includes('glory') ||
          titleLower.includes('vincenzo') ||
          titleLower.includes('beauty') ||
          titleLower.includes('dead') ||
          titleLower.includes('kingdom') ||
          titleLower.includes('proposal')
        );
      }
      if (selectedCategory === 'pakistani') {
        return (
          titleLower.includes('bin') ||
          titleLower.includes('parizaad') ||
          titleLower.includes('tum') ||
          titleLower.includes('humsafar') ||
          titleLower.includes('paas')
        );
      }
      if (selectedCategory === 'turkish') {
        return (
          titleLower.includes('ertugrul') ||
          titleLower.includes('osman') ||
          titleLower.includes('yargi') ||
          titleLower.includes('kapimi') ||
          titleLower.includes('dizi')
        );
      }
      if (selectedCategory === 'romance') {
        return (
          titleLower.includes('love') ||
          titleLower.includes('crash') ||
          titleLower.includes('queen') ||
          titleLower.includes('beauty') ||
          titleLower.includes('proposal') ||
          titleLower.includes('humsafar') ||
          titleLower.includes('bin')
        );
      }
      if (selectedCategory === 'historical') {
        return (
          titleLower.includes('ertugrul') ||
          titleLower.includes('osman') ||
          titleLower.includes('kingdom') ||
          titleLower.includes('alchemy')
        );
      }
      if (selectedCategory === 'thriller') {
        return (
          titleLower.includes('squid') ||
          titleLower.includes('glory') ||
          titleLower.includes('vincenzo') ||
          titleLower.includes('dead') ||
          titleLower.includes('taxi')
        );
      }
      return true;
    });
  }, [selectedCategory, activeItems]);

  const spotlightDrama = dramasList[0] || null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 select-none">
      {/* Dynamic Hero Spotlight Banner */}
      {spotlightDrama && !searchResults && (
        <div className="relative w-full h-[65vh] min-h-[460px] max-h-[600px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${spotlightDrama.posterUrl})`,
              filter: 'brightness(0.38)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 z-10">
            <div className="max-w-2xl space-y-4 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" className="flex items-center gap-1 font-bold text-xs py-1 px-2.5">
                  <IconFlame className="w-3.5 h-3.5 text-accent" variant="Bold" />
                  TRENDING DRAMA
                </Badge>
                <Badge variant="rating" className="text-amber-400 border-amber-500/30 text-xs">
                  ⭐ 9.8 / 10 Masterpiece
                </Badge>
                <Badge variant="quality" className="text-slate-300 text-xs">
                  1080p Full HD
                </Badge>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                  Dual Audio + Subtitles
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-xl">
                {spotlightDrama.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed drop-shadow">
                {spotlightDrama.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={`/watch/tv/${spotlightDrama.id}/s1e1`}>
                  <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xl shadow-primary/30">
                    <IconPlay className="w-5 h-5 text-white" variant="Bold" />
                    Watch Episode 1
                  </Button>
                </Link>

                <Link href={`/tv/${spotlightDrama.slug}`}>
                  <Button variant="glass" size="lg" className="flex items-center gap-2">
                    <IconInfoCircle className="w-4 h-4" />
                    All Episodes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Hub */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <IconTV className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                Asian & Global Dramas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Stream K-Dramas, Pakistani hits, Turkish Dizi, and emotional masterpieces with multi-language dubs and subtitles.
            </p>
          </div>

          {/* Drama Search Form */}
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search Squid Game, Tere Bin, Queen of Tears..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-10 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <IconMagnifer className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {dramaCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.value
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Drama Series Grid */}
        <div>
          {loading || searching ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading drama catalog...</p>
            </div>
          ) : filteredDramas.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <IconTV className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No drama series found</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                No matching titles found for &quot;{searchQuery || selectedCategory}&quot;. Try searching for another drama title.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSearchResults(null);
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Showing {filteredDramas.length} drama titles</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredDramas.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
