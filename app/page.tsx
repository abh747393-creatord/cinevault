'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconPlay, IconPlus, IconCheck, IconStar, IconBolt, IconStars } from '@/components/ui/icons';
import { HeroBanner } from '@/components/hero/hero-banner';
import { ContentRow } from '@/components/rows/content-row';
import { ContinueWatchingRow } from '@/components/rows/continue-watching-row';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { ContentItem } from '@/types/content';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';
import { movieboxApi } from '@/lib/api/moviebox-client';

// Client-side module-level cache to ensure instant zero-latency Home navigation
let cachedLiveItems: ContentItem[] | null = null;

export default function HomePage() {
  const [infoModalContent, setInfoModalContent] = useState<ContentItem | null>(null);
  const [inList, setInList] = useState(false);
  const [liveItems, setLiveItems] = useState<ContentItem[]>(() => cachedLiveItems || []);

  useEffect(() => {
    let isMounted = true;
    movieboxApi.homepage('all', 1).then((data) => {
      if (!isMounted) return;
      if (data && data.items && data.items.length > 0) {
        const mapped: ContentItem[] = data.items.map((it) => ({
          id: `mb-${it.id.value}`,
          externalId: it.id.value,
          title: it.title,
          slug: `mb-${it.id.value}`,
          contentType: it.media_type === 'series' ? 'tv' : 'movie',
          posterUrl: it.poster_url || '',
          backdropUrl: it.poster_url || '',
          description: `${it.title} (${it.year || 'Latest'})`,
          releaseDate: it.year ? `${it.year}-01-01` : '',
          year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
          rating: data.metrics?.[it.id.value]?.rating || 8.0,
          featured: false,
          genres: [],
          language: 'English',
          status: 'released',
        }));
        cachedLiveItems = mapped;
        setLiveItems(mapped);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const featuredItems = useMemo(() => {
    const seedFeatured = SEED_CONTENT.filter((item) => item.featured);
    if (liveItems.length > 0) {
      const liveFeatured = liveItems.slice(0, 5).map((item) => ({ ...item, featured: true }));
      return [...liveFeatured, ...seedFeatured];
    }
    return seedFeatured;
  }, [liveItems]);

  const trendingItems = useMemo(() => {
    if (liveItems.length > 0) {
      return [...liveItems, ...SEED_CONTENT];
    }
    return [...SEED_CONTENT].sort((a, b) => b.rating - a.rating);
  }, [liveItems]);

  const movieboxFeatured = useMemo(() => {
    const seedMb = SEED_CONTENT.filter((c) => c.id.startsWith('mb-'));
    if (liveItems.length > 0) {
      return [...seedMb, ...liveItems];
    }
    return seedMb;
  }, [liveItems]);

  const latestMovies = useMemo(() => {
    const liveMovies = liveItems.filter((i) => i.contentType === 'movie');
    const seedMovies = SEED_CONTENT.filter((item) => item.contentType === 'movie');
    return liveMovies.length > 0 ? [...liveMovies, ...seedMovies] : seedMovies;
  }, [liveItems]);

  const latestTvShows = useMemo(() => {
    const liveTv = liveItems.filter((i) => i.contentType === 'tv');
    const seedTv = SEED_CONTENT.filter((item) => item.contentType === 'tv');
    return liveTv.length > 0 ? [...liveTv, ...seedTv] : seedTv;
  }, [liveItems]);

  const popularAnime = SEED_CONTENT.filter((item) => item.contentType === 'anime');
  const actionItems = SEED_CONTENT.filter((item) => item.genres.some((g) => g.slug === 'action'));
  const scifiItems = SEED_CONTENT.filter((item) => item.genres.some((g) => g.slug === 'sci-fi'));
  const animationItems = SEED_CONTENT.filter((item) => item.genres.some((g) => g.slug === 'animation'));
  const dramaItems = SEED_CONTENT.filter((item) => item.genres.some((g) => g.slug === 'drama'));
  const comedyItems = SEED_CONTENT.filter((item) => item.genres.some((g) => g.slug === 'comedy'));

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
      <HeroBanner
        featuredItems={featuredItems}
        onOpenInfo={handleOpenInfo}
      />

      {/* Content Rows Container */}
      <div className="space-y-6 md:space-y-8 -mt-6 sm:-mt-10 relative z-20">
        {/* Continue Watching Row (Only when items exist) */}
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
                Stream 1080p, 4K, and Multi-Res releases directly from high-speed CDN mirrors with multi-language dubs.
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

        {/* CineVault VIP Featured Streams */}
        <ContentRow
          title="⚡ CineVault VIP Catalog"
          items={movieboxFeatured}
          exploreHref="/moviebox"
          onOpenInfo={handleOpenInfo}
        />

        {/* Trending Now */}
        <ContentRow
          title="Trending Now"
          items={trendingItems}
          exploreHref="/trending"
          onOpenInfo={handleOpenInfo}
        />

        {/* Latest Movies */}
        <ContentRow
          title="Latest Movies"
          items={latestMovies}
          exploreHref="/movies"
          onOpenInfo={handleOpenInfo}
        />

        {/* Latest TV Shows */}
        <ContentRow
          title="Latest TV Shows"
          items={latestTvShows}
          exploreHref="/tv"
          onOpenInfo={handleOpenInfo}
        />

        {/* Popular Anime */}
        <ContentRow
          title="Popular Anime"
          items={popularAnime}
          exploreHref="/anime"
          onOpenInfo={handleOpenInfo}
        />

        {/* Sci-Fi Adventures */}
        <ContentRow
          title="Sci-Fi & Cyberpunk"
          items={scifiItems}
          exploreHref="/movies?genre=sci-fi"
          onOpenInfo={handleOpenInfo}
        />

        {/* Action Packed */}
        <ContentRow
          title="High-Octane Action"
          items={actionItems}
          exploreHref="/movies?genre=action"
          onOpenInfo={handleOpenInfo}
        />

        {/* Animation & Fantasy */}
        <ContentRow
          title="World of Animation"
          items={animationItems}
          exploreHref="/movies?genre=animation"
          onOpenInfo={handleOpenInfo}
        />

        {/* Drama & Suspense */}
        <ContentRow
          title="Drama & Mystery"
          items={dramaItems}
          exploreHref="/movies?genre=drama"
          onOpenInfo={handleOpenInfo}
        />

        {/* Comedy */}
        <ContentRow
          title="Comedy & Lighthearted"
          items={comedyItems}
          exploreHref="/movies?genre=comedy"
          onOpenInfo={handleOpenInfo}
        />
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
                  <Badge variant="rating" size="sm" className="flex items-center gap-1">
                    <IconStar className="w-2.5 h-2.5 text-amber-300" variant="Bold" />
                    {infoModalContent.rating}
                  </Badge>
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
                      : `/watch/tv/${infoModalContent.id}/ep-oc-101`
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

            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/10">
              <div>
                <span className="text-slate-400 block mb-1 font-semibold">Genres</span>
                <div className="flex flex-wrap gap-1">
                  {infoModalContent.genres.map((g) => (
                    <span key={g.id} className="bg-white/10 px-2 py-0.5 rounded text-slate-200">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {infoModalContent.cast && infoModalContent.cast.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Starring Cast</span>
                  <p className="text-slate-200">{infoModalContent.cast.join(', ')}</p>
                </div>
              )}
            </div>

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
