'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Plus, Check, Star } from 'lucide-react';
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

export default function HomePage() {
  const [infoModalContent, setInfoModalContent] = useState<ContentItem | null>(null);
  const [inList, setInList] = useState(false);

  const featuredItems = SEED_CONTENT.filter((item) => item.featured);
  const trendingItems = [...SEED_CONTENT].sort((a, b) => b.rating - a.rating);
  const latestMovies = SEED_CONTENT.filter((item) => item.contentType === 'movie');
  const latestTvShows = SEED_CONTENT.filter((item) => item.contentType === 'tv');
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
                    <Star className="w-2.5 h-2.5 fill-amber-300" />
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
                    <Play className="w-4 h-4 fill-white" />
                    Play
                  </Button>
                </Link>
                <Button
                  variant={inList ? 'accent' : 'glass'}
                  size="icon"
                  onClick={handleToggleWatchlist}
                  className="h-9 w-9"
                >
                  {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
