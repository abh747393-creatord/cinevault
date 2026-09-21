'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  IconStars,
  IconPlay,
  IconMagnifer,
  IconClapperboardPlay,
  IconInfoCircle,
  IconLayers,
  IconBolt,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { deduplicateAndCleanCatalog, getCanonicalTitle } from '@/lib/utils/content-filter';

const TOP_ANIME_QUERIES = [
  'Demon Slayer',
  'Attack on Titan',
  'Jujutsu Kaisen',
  'Solo Leveling',
  'Naruto',
  'One Piece',
  'Death Note',
  'Bleach',
  'Chainsaw Man',
  'Dragon Ball',
];

export default function AnimePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [animeList, setAnimeList] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const animeCategories = [
    { label: 'All Anime', value: 'all' },
    { label: '🔥 Trending Anime', value: 'trending' },
    { label: '🎙️ Hindi & Dual Audio', value: 'dub' },
    { label: '⚔️ Action & Shonen', value: 'action' },
    { label: '✨ Fantasy & Magic', value: 'fantasy' },
    { label: '🚀 Cyberpunk & Sci-Fi', value: 'scifi' },
  ];

  // Map raw MovieBox catalog items into CineVault ContentItem objects
  const mapToContentItem = (it: MovieBoxCatalogItem): ContentItem => {
    const rawId = it.id.value;
    const isSeries = it.media_type === 'series';
    const titleLower = it.title.toLowerCase();
    const hasHindi = titleLower.includes('hindi');
    const isAction =
      titleLower.includes('titan') ||
      titleLower.includes('slayer') ||
      titleLower.includes('naruto') ||
      titleLower.includes('piece') ||
      titleLower.includes('chainsaw') ||
      titleLower.includes('dragon');
    const isFantasy =
      titleLower.includes('jujutsu') ||
      titleLower.includes('leveling') ||
      titleLower.includes('bleach') ||
      titleLower.includes('death') ||
      titleLower.includes('slayer');
    const isSciFi =
      titleLower.includes('cyber') ||
      titleLower.includes('arcane') ||
      titleLower.includes('beast') ||
      titleLower.includes('war');

    const genres = [{ id: 'g-anime', name: 'Anime', slug: 'anime' }];
    if (isAction) genres.push({ id: 'g-action', name: 'Action', slug: 'action' });
    if (isFantasy) genres.push({ id: 'g-fantasy', name: 'Fantasy', slug: 'fantasy' });
    if (isSciFi) genres.push({ id: 'g-scifi', name: 'Sci-Fi', slug: 'sci-fi' });

    const availableAudio = hasHindi
      ? ['Hindi (Dub)', 'Japanese (Original)', 'English (Dub)']
      : ['Japanese (Original)', 'English (Dub)'];

    const cleanTitle = getCanonicalTitle(it.title);

    return {
      id: `mb-${rawId}`,
      externalId: rawId,
      title: cleanTitle || it.title,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl: it.poster_url || '/images/neutral-poster.svg',
      backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
      description: `${cleanTitle || it.title} (${it.year || 'Anime Series'})`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      genres,
      language: 'Japanese',
      availableAudio,
      availableSubtitles: ['English', 'Spanish', 'Hindi', 'French'],
      status: 'released',
    };
  };

  // Initial load: Fetch top popular anime franchises in parallel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all(
      TOP_ANIME_QUERIES.map((q) =>
        movieboxApi.search(q).catch((err) => {
          console.warn(`[AnimeHub] Search for ${q} failed:`, err);
          return [] as MovieBoxCatalogItem[];
        })
      )
    )
      .then((resultsArray) => {
        if (!isMounted) return;
        const flattened = resultsArray.flat();

        // Strictly clean out any adult/mockbuster content and deduplicate
        const cleaned = deduplicateAndCleanCatalog(flattened);
        const uniqueItems = cleaned.map(mapToContentItem);

        setAnimeList(uniqueItems);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[AnimeHub] Failed to fetch initial anime:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live Anime Search
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
      const cleaned = deduplicateAndCleanCatalog(results);
      const mapped = cleaned.map(mapToContentItem);
      setSearchResults(mapped);
    } catch (err) {
      console.error('[AnimeHub] Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Filter and category logic
  const displayedAnime = useMemo(() => {
    let list = searchResults !== null ? searchResults : animeList;

    if (searchQuery.trim() && searchResults === null) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'trending') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (selectedCategory === 'dub') {
      list = list.filter((a) =>
        a.title.toLowerCase().includes('hindi') ||
        a.availableAudio?.some((aud) => aud.toLowerCase().includes('dub'))
      );
    } else if (selectedCategory === 'action') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'action'));
    } else if (selectedCategory === 'fantasy') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'fantasy'));
    } else if (selectedCategory === 'scifi') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'sci-fi'));
    }

    return list;
  }, [animeList, searchResults, searchQuery, selectedCategory]);

  // Featured Anime Hero Item (Demon Slayer or Solo Leveling or first available item)
  const featuredAnime = useMemo(() => {
    return (
      animeList.find((a) => a.title.toLowerCase().includes('infinity castle')) ||
      animeList.find((a) => a.title.toLowerCase().includes('solo leveling')) ||
      animeList[0] ||
      null
    );
  }, [animeList]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Anime Hub Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-background border border-purple-500/20 mx-4 sm:mx-6 md:mx-12 mt-4 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 flex items-center gap-1.5">
                <IconStars className="w-3.5 h-3.5 text-white" variant="Bold" />
                ANIME HUB
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Japanese & Hindi Dub Catalog
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hidden sm:inline-flex items-center gap-1.5">
                <IconLayers className="w-3 h-3 text-purple-400" />
                1080p Ultra CDN
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Watch <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">Anime Online</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Stream Demon Slayer, Attack on Titan, Jujutsu Kaisen, Solo Leveling, Naruto, and hundreds of top anime with multi-season episodes, Hindi dubs, and Japanese audio.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0 min-w-[240px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconBolt className="w-3.5 h-3.5 text-purple-400" />
              Available Audio Tracks
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Japanese (Original)
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                Hindi Dub
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                English Dub
              </span>
            </div>
          </div>
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
              placeholder="Search anime (e.g. Demon Slayer, Attack on Titan, Solo Leveling, Naruto)..."
              className="w-full h-12 sm:h-14 pl-12 pr-28 text-sm sm:text-base rounded-2xl bg-black/60 hover:bg-black/70 focus:bg-black/80 border border-purple-500/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={searching}
              className="absolute right-2 h-8 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20"
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
            {animeCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setSearchResults(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.value && searchResults === null
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
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
              <span>Showing {displayedAnime.length} anime series & movies</span>
            )}
          </div>
        </div>

        {/* Featured Spotlight Card (If available and not actively searching) */}
        {!searchQuery && selectedCategory === 'all' && featuredAnime && (
          <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-card to-background p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center shadow-2xl">
            <div className="w-full md:w-56 h-80 rounded-2xl overflow-hidden shrink-0 shadow-lg relative bg-black/60">
              <img
                src={featuredAnime.posterUrl}
                alt={featuredAnime.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-purple-600 text-white">
                  SPOTLIGHT
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" size="sm">
                  ★ {featuredAnime.rating}
                </Badge>
                <Badge variant="outline" size="sm">
                  {featuredAnime.year}
                </Badge>
                <Badge variant="quality" size="sm">
                  1080p Ultra
                </Badge>
                {featuredAnime.availableAudio?.map((aud) => (
                  <span
                    key={aud}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10"
                  >
                    {aud}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {featuredAnime.title}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {featuredAnime.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={
                    featuredAnime.contentType === 'movie'
                      ? `/watch/movie/${featuredAnime.id}`
                      : `/watch/tv/${featuredAnime.id}/s1e1`
                  }
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-600/30"
                  >
                    <IconPlay className="w-4 h-4 text-white" variant="Bold" />
                    Play Now
                  </Button>
                </Link>

                <Link
                  href={
                    featuredAnime.contentType === 'movie'
                      ? `/movie/${featuredAnime.slug}`
                      : `/tv/${featuredAnime.slug}`
                  }
                >
                  <Button variant="outline" size="md" className="gap-2">
                    <IconInfoCircle className="w-4 h-4" />
                    Details & Seasons
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">
              Loading Anime Hub from CineVault Network...
            </p>
          </div>
        )}

        {/* Anime Cards Grid */}
        {!loading && (
          <>
            {displayedAnime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {displayedAnime.map((item) => (
                  <ContentCard key={item.id} content={item} className="w-full" />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <IconClapperboardPlay className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No anime found</h3>
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? `No anime results matching "${searchQuery}". Try searching for another title.`
                    : 'No anime available in this category.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults(null);
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
