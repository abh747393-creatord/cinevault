'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconMagnifer, IconClapperboardPlay, IconTV, IconStars, IconAlertCircle } from '@/components/ui/icons';
import { SearchBar } from '@/components/search/search-bar';
import { ContentCard } from '@/components/cards/content-card';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { ContentType, ContentItem } from '@/types/content';

function SearchContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<'all' | ContentType>('all');
  const [liveResults, setLiveResults] = useState<ContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(() => {
      import('@/lib/providers/resolver').then(({ providerResolver }) => {
        providerResolver.globalSearch(q).then((results) => {
          if (!isMounted) return;
          const mapped: ContentItem[] = results.map((r) => ({
            id: r.id,
            title: r.title,
            slug: r.id,
            contentType: r.contentType,
            posterUrl: r.posterUrl || '',
            backdropUrl: r.posterUrl || '',
            description: r.overview || '',
            releaseDate: r.year ? `${r.year}-01-01` : '',
            year: r.year || 2024,
            rating: 7.8,
            genres: [],
            language: 'English',
            status: 'released',
          }));
          setLiveResults(mapped);
          setIsSearching(false);
        }).catch(() => {
          if (isMounted) setIsSearching(false);
        });
      });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const localMatches = SEED_CONTENT.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(q);
      const matchesDesc = item.description.toLowerCase().includes(q);
      const matchesOrig = item.originalTitle?.toLowerCase().includes(q);
      const matchesGenre = item.genres.some((g) => g.name.toLowerCase().includes(q));
      const matchesCast = item.cast?.some((c) => c.toLowerCase().includes(q));
      const matchesDirector = item.director?.toLowerCase().includes(q);

      return (
        matchesTitle ||
        matchesDesc ||
        matchesOrig ||
        matchesGenre ||
        matchesCast ||
        matchesDirector
      );
    });

    // Prioritize live provider-backed results from Sign Ultra VIP Cinema
    const combined = [...liveResults];
    const seenTitles = new Set(liveResults.map((m) => m.title.toLowerCase()));

    for (const r of localMatches) {
      if (!seenTitles.has(r.title.toLowerCase())) {
        seenTitles.add(r.title.toLowerCase());
        combined.push(r);
      }
    }

    return combined;
  }, [query, liveResults]);

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return searchResults;
    return searchResults.filter((item) => item.contentType === activeTab);
  }, [searchResults, activeTab]);

  const moviesCount = searchResults.filter((i) => i.contentType === 'movie').length;
  const tvCount = searchResults.filter((i) => i.contentType === 'tv').length;
  const animeCount = searchResults.filter((i) => i.contentType === 'anime').length;

  const suggestedTerms = [
    'Tears of Steel',
    'Sintel',
    'Kyoto Blade',
    'Big Buck Bunny',
    'Cosmos Laundromat',
    'Sci-Fi',
    'Animation',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Search Header and Input */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl sm:text-4xl font-black text-white">
          Explore CineVault
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Instant discovery across feature movies, serialized television, and anime.
        </p>
        <SearchBar initialQuery={query} onSearch={setQuery} />

        {/* Suggested keywords chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 mr-1">Popular searches:</span>
          {suggestedTerms.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-full border border-white/5 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      {query.trim() && (
        <div className="flex items-center justify-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Results ({searchResults.length})
          </button>
          <button
            onClick={() => setActiveTab('movie')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'movie'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <IconClapperboardPlay className="w-3.5 h-3.5" />
            Movies ({moviesCount})
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'tv'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <IconTV className="w-3.5 h-3.5" />
            TV Shows ({tvCount})
          </button>
          <button
            onClick={() => setActiveTab('anime')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'anime'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <IconStars className="w-3.5 h-3.5" />
            Anime ({animeCount})
          </button>
        </div>
      )}

      {/* Search Results Grid */}
      {query.trim() ? (
        filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredResults.map((item) => (
              <ContentCard key={item.id} content={item} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5 max-w-lg mx-auto">
            <IconAlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">
              No results found for &ldquo;{query}&rdquo;
            </h3>
            <p className="text-xs text-slate-400">
              We couldn&apos;t find matching titles in the catalog. Try searching for one of our featured titles like &ldquo;Tears of Steel&rdquo; or &ldquo;Kyoto Blade&rdquo;.
            </p>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="py-16 text-center space-y-2">
          <IconMagnifer className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">Type above to search across our full streaming library.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
