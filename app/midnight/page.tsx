'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  IconMoonStars,
  IconPlay,
  IconMagnifer,
  IconClapperboardPlay,
  IconTV,
  IconFlame,
  IconBolt,
  IconInfoCircle,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { getCanonicalTitle } from '@/lib/utils/content-filter';

export default function MidnightPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [midnightList, setMidnightList] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const midnightCategories = [
    { label: '🌙 All Midnight', value: 'all' },
    { label: '🎬 Midnight Movies', value: 'movies' },
    { label: '📺 Midnight Series', value: 'series' },
    { label: '🎙️ Dubbed & Hindi', value: 'dubbed' },
  ];

  // Map raw MovieBox catalog items into CineVault ContentItem objects
  const mapToContentItem = (it: MovieBoxCatalogItem): ContentItem => {
    const rawId = it.id.value;
    const isSeries = it.media_type === 'series';
    const titleLower = it.title.toLowerCase();
    const hasHindi =
      titleLower.includes('hindi') ||
      titleLower.includes('dub') ||
      titleLower.includes('tamil') ||
      titleLower.includes('telugu');

    const cleanTitle = getCanonicalTitle(it.title);

    const genres = [
      { id: 'g-midnight', name: 'Midnight', slug: 'midnight' },
      { id: isSeries ? 'g-tv' : 'g-movie', name: isSeries ? 'TV Series' : 'Movie', slug: isSeries ? 'tv' : 'movie' },
    ];

    const availableAudio = hasHindi
      ? ['Hindi / Regional (Dub)', 'Original Audio']
      : ['Original Audio', 'English Subtitles'];

    return {
      id: `mb-${rawId}`,
      externalId: rawId,
      title: cleanTitle || it.title,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl: it.poster_url || '/images/neutral-poster.svg',
      backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
      description: `${cleanTitle || it.title} (${it.year || 'Midnight Edition'})`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      genres,
      language: hasHindi ? 'Multi-Dub' : 'Original',
      availableAudio,
      availableSubtitles: ['English', 'Spanish'],
      status: 'released',
    };
  };

  // Initial load: Fetch genuine upstream Midnight category feed (tab=9)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadMidnightContent() {
      try {
        const res = await movieboxApi.homepage('9', 1);
        if (!isMounted) return;

        const rawItems = res?.items || [];

        // Deduplicate items by raw ID
        const seenIds = new Set<string>();
        const uniqueItems: ContentItem[] = [];

        for (const item of rawItems) {
          const idVal = item.id?.value;
          if (!idVal || seenIds.has(idVal)) continue;
          seenIds.add(idVal);
          uniqueItems.push(mapToContentItem(item));
        }

        setMidnightList(uniqueItems);
      } catch (err) {
        console.error('[Midnight] Failed to fetch homepage tab 9:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMidnightContent();

    return () => {
      isMounted = false;
    };
  }, []);

  // In-page search / filter
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      // First filter currently loaded midnight catalog
      const localMatches = midnightList.filter((item) =>
        item.title.toLowerCase().includes(q)
      );

      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      } else {
        // Fallback search upstream if local filter yields zero
        const upstreamResults = await movieboxApi.search(q);
        const mapped = upstreamResults.map(mapToContentItem);
        setSearchResults(mapped);
      }
    } catch (err) {
      console.error('[Midnight] Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Filter and category logic
  const displayedContent = useMemo(() => {
    let list = searchResults !== null ? searchResults : midnightList;

    if (searchQuery.trim() && searchResults === null) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => item.title.toLowerCase().includes(q));
    }

    switch (selectedCategory) {
      case 'movies':
        return list.filter((it) => it.contentType === 'movie');
      case 'series':
        return list.filter((it) => it.contentType === 'tv');
      case 'dubbed':
        return list.filter(
          (it) =>
            it.availableAudio?.some((a) => a.toLowerCase().includes('dub') || a.toLowerCase().includes('hindi')) ||
            it.title.toLowerCase().includes('dub') ||
            it.title.toLowerCase().includes('hindi')
        );
      case 'all':
      default:
        return list;
    }
  }, [midnightList, searchResults, searchQuery, selectedCategory]);

  // Spotlight Midnight title
  const featuredMidnight = useMemo(() => {
    if (midnightList.length === 0) return null;
    return midnightList[0] || null;
  }, [midnightList]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Midnight Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-950/70 to-background border border-indigo-500/20 mx-4 sm:mx-6 md:mx-12 mt-4 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-1.5">
                <IconMoonStars className="w-3.5 h-3.5 text-white" />
                MIDNIGHT
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                Late-Night Movies & Series
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hidden sm:inline-flex items-center gap-1.5">
                <IconBolt className="w-3 h-3 text-indigo-400" />
                HD & 4K Streams
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              After Dark{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-200 bg-clip-text text-transparent">
                Midnight Cinema
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              After dark, the stories get darker. Explore premium late-night features, intense dramas, uncut cinema, and exclusive midnight series with authentic multi-language audio tracks.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0 min-w-[240px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconMoonStars className="w-3.5 h-3.5 text-indigo-400" />
              Midnight Vault Collection
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                120+ Titles
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Movies & Series
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-white/10">
                Multi-Audio
              </span>
            </div>
          </div>
        </div>

        {/* Search Form */}
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
              placeholder="Search midnight catalog..."
              className="w-full h-12 sm:h-14 pl-12 pr-28 text-sm sm:text-base rounded-2xl bg-black/60 hover:bg-black/70 focus:bg-black/80 border border-indigo-500/30 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={searching}
              className="absolute right-2 h-8 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20"
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-6">
        {/* Category Pills & Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {midnightCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setSearchResults(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.value && searchResults === null
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {searchResults !== null ? (
              <span>Found {searchResults.length} search results</span>
            ) : (
              <span>Showing {displayedContent.length} titles</span>
            )}
          </div>
        </div>

        {/* Featured Spotlight Card */}
        {!searchQuery && selectedCategory === 'all' && featuredMidnight && (
          <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-card to-background p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center shadow-2xl">
            <div className="w-full md:w-56 h-80 rounded-2xl overflow-hidden shrink-0 shadow-lg relative bg-black/60">
              <img
                src={featuredMidnight.posterUrl}
                alt={featuredMidnight.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-indigo-600 text-white">
                  SPOTLIGHT
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" size="sm">
                  ★ {featuredMidnight.rating}
                </Badge>
                <Badge variant="outline" size="sm">
                  {featuredMidnight.year}
                </Badge>
                <Badge variant="quality" size="sm">
                  1080p Full HD
                </Badge>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10 uppercase">
                  {featuredMidnight.contentType === 'movie' ? 'Feature Film' : 'Series'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {featuredMidnight.title}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {featuredMidnight.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={
                    featuredMidnight.contentType === 'movie'
                      ? `/watch/movie/${featuredMidnight.id}`
                      : `/watch/tv/${featuredMidnight.id}/s1e1`
                  }
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30"
                  >
                    <IconPlay className="w-4 h-4 text-white" variant="Bold" />
                    Play Now
                  </Button>
                </Link>

                <Link
                  href={
                    featuredMidnight.contentType === 'movie'
                      ? `/movie/${featuredMidnight.slug}`
                      : `/tv/${featuredMidnight.slug}`
                  }
                >
                  <Button
                    variant="secondary"
                    size="md"
                    className="gap-2 border border-white/10 hover:bg-white/10"
                  >
                    <IconInfoCircle className="w-4 h-4" />
                    Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Content Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : displayedContent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {displayedContent.map((item) => (
              <ContentCard key={item.id} content={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <IconMoonStars className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">No titles found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t find any Midnight titles matching your selection. Try clearing the search or choosing another filter.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setSelectedCategory('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
