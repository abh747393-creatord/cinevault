'use client';

import React from 'react';
import { IconFilter, IconRestart } from '@/components/ui/icons';
import { Genre, ContentFilterOptions } from '@/types/content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  genres: Genre[];
  filters: ContentFilterOptions;
  onChange: (filters: ContentFilterOptions) => void;
  className?: string;
}

export function FilterPanel({ genres, filters, onChange, className }: FilterPanelProps) {
  const sortOptions = [
    { label: 'Most Popular', value: 'popular' },
    { label: 'Latest Releases', value: 'latest' },
    { label: 'Highest Rated', value: 'rating' },
    { label: 'Alphabetical (A-Z)', value: 'alphabetical' },
  ] as const;

  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

  const handleGenreChange = (slug?: string) => {
    onChange({
      ...filters,
      genreSlug: filters.genreSlug === slug ? undefined : slug,
    });
  };

  const handleSortChange = (sortBy: ContentFilterOptions['sortBy']) => {
    onChange({ ...filters, sortBy });
  };

  const handleYearChange = (year?: number) => {
    onChange({
      ...filters,
      year: filters.year === year ? undefined : year,
    });
  };

  const handleReset = () => {
    onChange({
      contentType: filters.contentType,
      genreSlug: undefined,
      year: undefined,
      minRating: undefined,
      sortBy: 'popular',
    });
  };

  const hasActiveFilters = Boolean(
    filters.genreSlug || filters.year || filters.minRating || (filters.sortBy && filters.sortBy !== 'popular')
  );

  return (
    <div className={cn('bg-card/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 space-y-5', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <IconFilter className="w-4 h-4 text-primary" />
          Filter & Sort
        </h4>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            aria-label="Reset filters"
          >
            <IconRestart className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Sort Options */}
      <div>
        <label className="text-xs font-semibold text-slate-400 block mb-2">Sort By</label>
        <div className="grid grid-cols-2 gap-1.5">
          {sortOptions.map((opt) => {
            const isSelected = (filters.sortBy || 'popular') === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-xl text-left font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genres Pills */}
      <div>
        <label className="text-xs font-semibold text-slate-400 block mb-2">Genre</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleGenreChange(undefined)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-lg font-medium transition-all',
              !filters.genreSlug
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
          >
            All
          </button>
          {genres.map((genre) => {
            const isSelected = filters.genreSlug === genre.slug;
            return (
              <button
                key={genre.id}
                onClick={() => handleGenreChange(genre.slug)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                {genre.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Release Year */}
      <div>
        <label className="text-xs font-semibold text-slate-400 block mb-2">Release Year</label>
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => {
            const isSelected = filters.year === y;
            return (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
