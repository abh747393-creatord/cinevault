'use client';

import React, { useState, useMemo } from 'react';
import { Tv, SlidersHorizontal, X } from 'lucide-react';
import { ContentCard } from '@/components/cards/content-card';
import { FilterPanel } from '@/components/filters/filter-panel';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { SEED_CONTENT, SEED_GENRES } from '@/lib/data/catalog-seed';
import { ContentFilterOptions } from '@/types/content';

export default function TvShowsPage() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState<ContentFilterOptions>({
    contentType: 'tv',
    sortBy: 'popular',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTv = useMemo(() => {
    let list = SEED_CONTENT.filter((c) => c.contentType === 'tv');

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

    if (filters.sortBy === 'latest') {
      list.sort((a, b) => b.year - a.year);
    } else if (filters.sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (filters.sortBy === 'alphabetical') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [filters, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Tv className="w-7 h-7 text-primary" />
            TV Shows & Series
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Episodic series, multi-season adventures, and anthology shows.
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
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        <div className="hidden md:block col-span-1 sticky top-24">
          <FilterPanel
            genres={SEED_GENRES}
            filters={filters}
            onChange={setFilters}
          />
        </div>

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
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <FilterPanel
                genres={SEED_GENRES}
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setShowMobileFilters(false);
                }}
              />
            </div>
          </div>
        )}

        <div className="col-span-1 md:col-span-3">
          {filteredTv.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredTv.map((show) => (
                <ContentCard
                  key={show.id}
                  content={show}
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
              <Tv className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No TV shows found</h3>
              <p className="text-xs text-slate-400">
                Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
