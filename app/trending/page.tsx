'use client';

import React, { useState, useEffect } from 'react';
import { IconFlame } from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { ContentItem } from '@/types/content';

export default function TrendingPage() {
  const [liveTrending, setLiveTrending] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    import('@/lib/api/moviebox-client').then(({ movieboxApi }) => {
      movieboxApi
        .homepage('all', 1)
        .then((data) => {
          if (!isMounted) return;
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
                description: `${it.title} (${it.year || 'Trending'})`,
                releaseDate: it.year ? `${it.year}-01-01` : '',
                year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
                rating: typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined,
                genres: [{ id: 'g-vip', name: 'Trending VIP', slug: 'vip' }],
                language: 'English',
                status: 'released',
              };
            });
            setLiveTrending(mapped);
          }
          setLoading(false);
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <IconFlame className="w-7 h-7 text-amber-500" variant="Bold" />
            Trending Content
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            The most popular movies and series streamed right now on CineVault.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Real-Time Trending Rank
        </span>
      </div>

      {loading && liveTrending.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-medium">Fetching real-time trending releases...</p>
        </div>
      ) : liveTrending.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {liveTrending.map((item, index) => (
            <div key={item.id} className="relative">
              <div className="absolute -top-3 -left-3 z-20 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 text-white font-black text-sm flex items-center justify-center shadow-lg">
                #{index + 1}
              </div>
              <ContentCard content={item} className="w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
          <IconFlame className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No trending items available</h3>
          <p className="text-xs text-slate-400">
            Please check back in a moment or retry your connection.
          </p>
        </div>
      )}
    </div>
  );
}
