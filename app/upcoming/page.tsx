'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  IconCalendar,
  IconClockCircle,
  IconStars,
  IconMagnifer,
  IconPlay,
  IconInfoCircle,
  IconClapperboardPlay,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function UpcomingPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveUpcoming, setLiveUpcoming] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: 'All Upcoming', value: 'all' },
    { label: '🔥 2026 Blockbusters', value: 'blockbusters' },
    { label: '🚀 Sci-Fi & Action', value: 'action' },
    { label: '🎭 Drama & Thriller', value: 'thriller' },
    { label: '🎨 Animation', value: 'animation' },
  ];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    // Fetch fresh upcoming releases from MovieBox gateway
    movieboxApi.homepage('movie', 1).then((data) => {
      if (!isMounted) return;
      if (data && data.items) {
        const upcoming2026 = data.items
          .filter((it) => it.year && parseInt(it.year, 10) >= 2026)
          .map((it) => {
            const metricRating = data.metrics?.[it.id.value]?.rating;
            const parsedRating = typeof metricRating === 'number' ? metricRating : undefined;
            return {
              id: `mb-${it.id.value}`,
              externalId: it.id.value,
              title: it.title,
              slug: `mb-${it.id.value}`,
              contentType: (it.media_type === 'series' ? 'tv' : 'movie') as 'movie' | 'tv',
              posterUrl: it.poster_url || '/images/neutral-poster.svg',
              backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
              description: `${it.title} (${it.year || '2026'}) - Highly anticipated upcoming release on CineVault.`,
              releaseDate: it.year ? `${it.year}-07-01` : '2026-07-01',
              year: parseInt(it.year || '2026', 10),
              rating: typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined,
              genres: [{ id: 'g-upcoming', name: 'Upcoming', slug: 'upcoming' }],
              language: 'English',
              status: 'upcoming' as const,
            };
          });
        setLiveUpcoming(upcoming2026);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const allUpcoming = useMemo(() => {
    return liveUpcoming;
  }, [liveUpcoming]);

  const filteredItems = useMemo(() => {
    let list = allUpcoming;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'blockbusters') {
      list = list.filter((m) => (m.rating !== undefined && m.rating >= 8.8) || m.quality === '4K');
    } else if (selectedCategory === 'action') {
      list = list.filter((m) =>
        m.genres.some((g) => g.slug === 'action' || g.slug === 'sci-fi')
      );
    } else if (selectedCategory === 'thriller') {
      list = list.filter((m) =>
        m.genres.some((g) => g.slug === 'thriller' || g.slug === 'drama' || g.slug === 'mystery')
      );
    } else if (selectedCategory === 'animation') {
      list = list.filter((m) =>
        m.genres.some((g) => g.slug === 'animation') || m.contentType === 'anime'
      );
    }

    return list;
  }, [allUpcoming, searchQuery, selectedCategory]);

  const spotlightItem = useMemo(() => {
    return (
      allUpcoming.find((m) => m.title.toLowerCase().includes('spider-man')) ||
      allUpcoming.find((m) => m.title.toLowerCase().includes('mandalorian')) ||
      allUpcoming[0] ||
      null
    );
  }, [allUpcoming]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Upcoming Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-background border border-amber-500/20 mx-4 sm:mx-6 md:mx-12 mt-4 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                <IconCalendar className="w-3.5 h-3.5 text-white" />
                UPCOMING CINEMA
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <IconClockCircle className="w-3 h-3 text-amber-400" />
                Coming Soon 2026 / 2027
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Upcoming <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-white bg-clip-text text-transparent">Movies & Series</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Discover the most eagerly anticipated cinematic experiences, world premiere theatrical trailers, and upcoming blockbusters scheduled for 2026 and beyond.
            </p>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0 min-w-[240px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconStars className="w-3.5 h-3.5 text-amber-400" />
              Premieres & Trailers
            </span>
            <span className="text-sm font-bold text-white">
              {allUpcoming.length} Confirmed Releases
            </span>
            <span className="text-xs text-slate-400">
              Trailers, synopsis & advance watchlist notifications
            </span>
          </div>
        </div>

        {/* Live Search Form */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 relative max-w-2xl"
        >
          <div className="relative flex items-center">
            <IconMagnifer className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search upcoming titles (e.g. Spider-Man, Star Wars, Mayday)..."
              className="w-full h-12 sm:h-14 pl-12 pr-4 text-sm sm:text-base rounded-2xl bg-black/60 hover:bg-black/70 focus:bg-black/80 border border-amber-500/30 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-slate-400 transition-all outline-none shadow-inner"
            />
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-6">
        {/* Category Pills & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing {filteredItems.length} upcoming titles
          </div>
        </div>

        {/* Spotlight Card */}
        {!searchQuery && selectedCategory === 'all' && spotlightItem && (
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-card to-background p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center shadow-2xl">
            <div className="w-full md:w-56 h-80 rounded-2xl overflow-hidden shrink-0 shadow-lg relative bg-black/60">
              <img
                src={spotlightItem.posterUrl}
                alt={spotlightItem.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-500 text-black">
                  PREMIERE SPOTLIGHT
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="rating" size="sm">
                  ★ {spotlightItem.rating}
                </Badge>
                <Badge variant="outline" size="sm">
                  {spotlightItem.releaseDate || '2026 Premiere'}
                </Badge>
                <Badge variant="quality" size="sm">
                  {spotlightItem.quality || '4K Ultra'}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white">
                {spotlightItem.title}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {spotlightItem.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={
                    spotlightItem.contentType === 'movie'
                      ? `/watch/movie/${spotlightItem.id}`
                      : `/watch/tv/${spotlightItem.id}/s1e1`
                  }
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/30 text-white font-bold"
                  >
                    <IconPlay className="w-4 h-4 text-white" variant="Bold" />
                    Watch Teaser / Premiere
                  </Button>
                </Link>

                <Link
                  href={
                    spotlightItem.contentType === 'movie'
                      ? `/movie/${spotlightItem.slug}`
                      : `/tv/${spotlightItem.slug}`
                  }
                >
                  <Button variant="outline" size="md" className="gap-2">
                    <IconInfoCircle className="w-4 h-4" />
                    Cast & Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <ContentCard key={item.id} content={item} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
            <IconClapperboardPlay className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No upcoming titles found</h3>
            <p className="text-xs text-slate-400">
              Try a different keyword or browse all upcoming releases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
