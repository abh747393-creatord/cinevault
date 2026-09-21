'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IconClapperboardPlay, IconSliderHorizontal, IconClose } from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { FilterPanel } from '@/components/filters/filter-panel';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { GENRES } from '@/lib/constants/genres';
import { ContentFilterOptions, ContentItem } from '@/types/content';

let cachedLiveMovies: ContentItem[] | null = null;

export default function MoviesPage() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState<ContentFilterOptions>({
    contentType: 'movie',
    sortBy: 'popular',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [liveMovies, setLiveMovies] = useState<ContentItem[]>(() => cachedLiveMovies || []);
  const [loading, setLoading] = useState(() => !cachedLiveMovies);

  useEffect(() => {
    let isMounted = true;
    if (cachedLiveMovies && cachedLiveMovies.length > 0) return;

    setLoading(true);
    import('@/lib/api/moviebox-client').then(({ movieboxApi }) => {
      movieboxApi.homepage('movie', 1).then((data) => {
        if (!isMounted) return;
        if (data && data.items && data.items.length > 0) {
          const mapped: ContentItem[] = data.items
            .filter((it) => it.media_type !== 'series')
            .map((it) => {
              const metricRating = data.metrics?.[it.id.value]?.rating;
              const parsedRating = typeof metricRating === 'number' ? metricRating : undefined;
              return {
                id: `mb-${it.id.value}`,
                externalId: it.id.value,
                title: it.title,
                slug: `mb-${it.id.value}`,
                contentType: 'movie',
                posterUrl: it.poster_url || '/images/neutral-poster.svg',
                backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
                description: `${it.title} (${it.year || 'Feature Film'})`,
                releaseDate: it.year ? `${it.year}-01-01` : '',
                year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
                rating: typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined,
                genres: [],
                language: 'English',
                status: 'released',
              };
            });
          cachedLiveMovies = mapped;
          setLiveMovies(mapped);
        }
        setLoading(false);
      }).catch(() => {
        if (isMounted) setLoading(false);
      });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMovies = useMemo(() => {
    let list: ContentItem[] = [...liveMovies];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.genres.some((g) => g.name.toLowerCase().includes(q))
      );
    }

    if (filters.genreSlug) {
      list = list.filter((m) => m.genres.some((g) => g.slug === filters.genreSlug));
    }

    if (filters.year) {
      list = list.filter((m) => m.year === filters.year);
    }

    if (filters.sortBy === 'latest') {
      list.sort((a, b) => b.year - a.year);
    } else if (filters.sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filters.sortBy === 'alphabetical') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Popular / default
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [filters, searchQuery, liveMovies]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <IconClapperboardPlay className="w-7 h-7 text-primary" />
            Movies Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse full-length feature films streaming directly from genuine provider sources.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-72">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          <Button
            variant="glass"
            size="md"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex items-center gap-2 whitespace-nowrap"
          >
            <IconSliderHorizontal className="w-4 h-4 text-primary" />
            Filters
          </Button>
        </div>
      </div>

      {/* Main Layout: Sidebar on Desktop, Grid on Right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filter Panel */}
        <div className="hidden md:block col-span-1 sticky top-24">
          <FilterPanel
            genres={GENRES}
            filters={filters}
            onChange={setFilters}
          />
        </div>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex flex-col justify-end animate-fade-in">
            <div className="bg-card border border-white/10 rounded-2xl p-4 max-h-[80vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="font-bold text-white">Filters</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileFilters(false)}
                >
                  <IconClose className="w-5 h-5" />
                </Button>
              </div>
              <FilterPanel
                genres={GENRES}
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setShowMobileFilters(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Movies Grid */}
        <div className="col-span-1 md:col-span-3">
          {loading && liveMovies.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-medium">Loading genuine provider catalog...</p>
            </div>
          ) : filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredMovies.map((movie) => (
                <ContentCard
                  key={movie.id}
                  content={movie}
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
              <IconClapperboardPlay className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No movies match your filters</h3>
              <p className="text-xs text-slate-400">
                Try resetting your genre or search criteria to discover more titles.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({ contentType: 'movie', sortBy: 'popular' });
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
