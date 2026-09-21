'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconPlay, IconPlus, IconCheck, IconStar, IconBolt, IconStars, IconMoonStars } from '@/components/ui/icons';
import { HeroBanner } from '@/components/hero/hero-banner';
import { ContentRow } from '@/components/rows/content-row';
import { ContinueWatchingRow } from '@/components/rows/continue-watching-row';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';

// Client-side module-level cache to ensure instant zero-latency Home navigation
let cachedAll: ContentItem[] | null = null;
let cachedMovies: ContentItem[] | null = null;
let cachedTv: ContentItem[] | null = null;
let cachedMidnight: ContentItem[] | null = null;

export default function HomePage() {
  const [infoModalContent, setInfoModalContent] = useState<ContentItem | null>(null);
  const [inList, setInList] = useState(false);
  const [allContent, setAllContent] = useState<ContentItem[]>(() => cachedAll || []);
  const [moviesList, setMoviesList] = useState<ContentItem[]>(() => cachedMovies || []);
  const [tvList, setTvList] = useState<ContentItem[]>(() => cachedTv || []);
  const [midnightList, setMidnightList] = useState<ContentItem[]>(() => cachedMidnight || []);
  const [loading, setLoading] = useState(() => !cachedAll);

  useEffect(() => {
    let isMounted = true;

    const mapCatalogItem = (it: MovieBoxCatalogItem, metrics?: Record<string, any>): ContentItem => {
      const rawId = it.id.value;
      const isSeries = it.media_type === 'series' || (it.season_count !== undefined && it.season_count > 0);
      const metricRating = metrics?.[rawId]?.rating;
      const parsedRating = metricRating ? parseFloat(metricRating) : undefined;

      return {
        id: `mb-${rawId}`,
        externalId: rawId,
        title: it.title,
        slug: `mb-${rawId}`,
        contentType: isSeries ? 'tv' : 'movie',
        posterUrl: it.poster_url || '/images/neutral-poster.svg',
        backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
        description: `${it.title} (${it.year || 'Latest Release'})`,
        releaseDate: it.year ? `${it.year}-01-01` : '',
        year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
        rating: typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined,
        featured: false,
        genres: [],
        language: 'English',
        status: isSeries ? 'ongoing' : 'released',
      };
    };

    Promise.allSettled([
      movieboxApi.homepage('all', 1),
      movieboxApi.homepage('movie', 1),
      movieboxApi.homepage('tv', 1),
      movieboxApi.homepage('9', 1),
    ]).then(([allRes, movieRes, tvRes, midnightRes]) => {
      if (!isMounted) return;

      if (allRes.status === 'fulfilled' && allRes.value?.items) {
        const mapped = allRes.value.items.map((it) => mapCatalogItem(it, allRes.value.metrics));
        cachedAll = mapped;
        setAllContent(mapped);
      }

      if (movieRes.status === 'fulfilled' && movieRes.value?.items) {
        const mapped = movieRes.value.items
          .filter((it) => it.media_type !== 'series')
          .map((it) => mapCatalogItem(it, movieRes.value.metrics));
        cachedMovies = mapped;
        setMoviesList(mapped);
      }

      if (tvRes.status === 'fulfilled' && tvRes.value?.items) {
        const mapped = tvRes.value.items
          .filter((it) => it.media_type === 'series' || (it.season_count ?? 0) > 0)
          .map((it) => mapCatalogItem(it, tvRes.value.metrics));
        cachedTv = mapped;
        setTvList(mapped);
      }

      if (midnightRes.status === 'fulfilled' && midnightRes.value?.items) {
        const mapped = midnightRes.value.items.map((it) => mapCatalogItem(it, midnightRes.value.metrics));
        cachedMidnight = mapped;
        setMidnightList(mapped);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredHeroItems = useMemo(() => {
    return allContent.slice(0, 5).map((item) => ({ ...item, featured: true }));
  }, [allContent]);

  const trendingItems = useMemo(() => {
    return allContent;
  }, [allContent]);

  const handleOpenInfo = (content: ContentItem) => {
    setInfoModalContent(content);
    setInList(isInWatchlist(content.id));
  };

  const handleToggleWatchlist = () => {
    if (!infoModalContent) return;
    if (inList) {
      removeFromWatchlist(infoModalContent.id);
      setInList(false);
    } else {
      addToWatchlist(infoModalContent);
      setInList(true);
    }
  };

  return (
    <div className="w-full space-y-6 md:space-y-10">
      {/* Cinematic Rotating Hero Banner */}
      {featuredHeroItems.length > 0 && (
        <HeroBanner
          featuredItems={featuredHeroItems}
          onOpenInfo={handleOpenInfo}
        />
      )}

      {/* Content Rows Container */}
      <div className="space-y-6 md:space-y-8 -mt-6 sm:-mt-10 relative z-20">
        {/* Continue Watching Row (Only when real user items exist) */}
        <ContinueWatchingRow />

        {/* CineVault VIP Quick Access Banner */}
        <div className="mx-4 sm:mx-6 md:mx-12 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/70 via-purple-950/50 to-card border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
              <IconBolt className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">CineVault Ultra VIP Cinema</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Stream genuine provider releases with multi-resolution DASH and authentic multi-track audio.
              </p>
            </div>
          </div>
          <Link href="/moviebox" className="shrink-0 w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold px-5 text-xs shadow-md shadow-red-500/20 flex items-center gap-1.5">
              <IconStars className="w-3.5 h-3.5" />
              Open VIP Cinema
            </Button>
          </Link>
        </div>

        {/* Trending Now */}
        {trendingItems.length > 0 && (
          <ContentRow
            title="Trending Now"
            items={trendingItems}
            exploreHref="/trending"
            onOpenInfo={handleOpenInfo}
          />
        )}

        {/* Latest Movies */}
        {moviesList.length > 0 && (
          <ContentRow
            title="Latest Movies"
            items={moviesList}
            exploreHref="/movies"
            onOpenInfo={handleOpenInfo}
          />
        )}

        {/* Latest TV Shows */}
        {tvList.length > 0 && (
          <ContentRow
            title="TV Shows & Series"
            items={tvList}
            exploreHref="/tv"
            onOpenInfo={handleOpenInfo}
          />
        )}

        {/* Midnight Section */}
        {midnightList.length > 0 && (
          <ContentRow
            title="🌙 Midnight Specials"
            items={midnightList}
            exploreHref="/midnight"
            onOpenInfo={handleOpenInfo}
          />
        )}
      </div>

      {/* Quick More Info Modal */}
      {infoModalContent && (
        <Modal
          isOpen={Boolean(infoModalContent)}
          onClose={() => setInfoModalContent(null)}
          className="max-w-3xl p-0 overflow-hidden"
        >
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={infoModalContent.backdropUrl}
              alt={infoModalContent.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white drop-shadow">
                  {infoModalContent.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                  {infoModalContent.rating !== undefined && infoModalContent.rating > 0 && (
                    <Badge variant="rating" size="sm" className="flex items-center gap-1">
                      <IconStar className="w-2.5 h-2.5 text-amber-300" variant="Bold" />
                      {infoModalContent.rating.toFixed(1)}
                    </Badge>
                  )}
                  <span>{infoModalContent.year}</span>
                  {infoModalContent.runtime && (
                    <span>• {formatDuration(infoModalContent.runtime)}</span>
                  )}
                  <span>• {infoModalContent.contentType.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={
                    infoModalContent.contentType === 'movie'
                      ? `/watch/movie/${infoModalContent.id}`
                      : `/tv/${infoModalContent.slug}`
                  }
                >
                  <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                    <IconPlay className="w-4 h-4 text-white" variant="Bold" />
                    Play
                  </Button>
                </Link>
                <Button
                  variant={inList ? 'accent' : 'glass'}
                  size="icon"
                  onClick={handleToggleWatchlist}
                  className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  aria-label={inList ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  title={inList ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  {inList ? <IconCheck className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {infoModalContent.description}
            </p>

            <div className="pt-3 flex justify-end">
              <Link
                href={
                  infoModalContent.contentType === 'movie'
                    ? `/movie/${infoModalContent.slug}`
                    : `/tv/${infoModalContent.slug}`
                }
              >
                <Button variant="outline" size="sm">
                  View Full Details Page
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
