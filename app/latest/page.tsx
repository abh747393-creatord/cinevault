'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IconClockCircle } from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';
import { movieboxApi } from '@/lib/api/moviebox-client';

export default function LatestPage() {
  const [liveLatest, setLiveLatest] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await movieboxApi.homepage('all', 1).catch(() => null);
      if (!data || !data.items || data.items.length === 0) {
        data = await movieboxApi.homepage('movie', 1).catch(() => null);
      }

      if (data && data.items && data.items.length > 0) {
        const mapped: ContentItem[] = data.items.map((it) => {
          const metricRating = data.metrics?.[it.id.value]?.rating;
          const parsedRating = typeof metricRating === 'number' ? metricRating : undefined;
          return {
            id: `mb-${it.id.value}`,
            externalId: it.id.value,
            title: it.title,
            slug: `mb-${it.id.value}`,
            contentType: it.media_type === 'series' ? 'tv' : 'movie',
            posterUrl: it.poster_url || '/images/neutral-poster.svg',
            backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
            description: `${it.title} (${it.year || 'Latest Release'})`,
            releaseDate: it.year ? `${it.year}-01-01` : '',
            year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
            rating: typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined,
            genres: [{ id: 'g-vip', name: 'VIP Cinema', slug: 'vip' }],
            language: 'English',
            status: 'released',
          };
        });
        setLiveLatest(mapped);
      } else {
        setError('Unable to load latest releases from the provider.');
      }
    } catch (err) {
      console.error('[LatestPage] Error loading releases:', err);
      setError('Failed to connect to the catalog provider. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <IconClockCircle className="w-7 h-7 text-primary" />
            Latest Releases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live auto-updating catalog of recently premiered movies, cinema releases, and episodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {loading ? 'Updating Catalog...' : `Auto-Updated Daily (${liveLatest.length} Titles)`}
          </span>
        </div>
      </div>

      {loading && liveLatest.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-medium">Fetching latest stream releases...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center space-y-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-sm font-medium text-red-400">{error}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={loadLatest}
            className="bg-primary hover:bg-primary/80 text-white"
          >
            Retry
          </Button>
        </div>
      ) : liveLatest.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {liveLatest.map((item) => (
            <ContentCard key={item.id} content={item} className="w-full" />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
          <IconClockCircle className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No releases available</h3>
          <p className="text-xs text-slate-400">
            Please check back in a moment or retry your connection.
          </p>
          <Button variant="secondary" size="sm" onClick={loadLatest}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
