'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  IconPlay,
  IconPlus,
  IconCheck,
  IconInfoCircle,
  IconStar,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/ui/icons';
import { ContentItem } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

interface HeroBannerProps {
  featuredItems: ContentItem[];
  onOpenInfo?: (content: ContentItem) => void;
}

export function HeroBanner({ featuredItems, onOpenInfo }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = featuredItems[currentIndex] || featuredItems[0];
  const [inList, setInList] = useState(false);

  useEffect(() => {
    if (current) {
      setInList(isInWatchlist(current.id));
    }
  }, [current]);

  // Auto rotate hero every 8 seconds
  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredItems.length]);

  if (!current) return null;

  const handleWatchlistToggle = () => {
    if (inList) {
      removeFromWatchlist(current.id);
      setInList(false);
    } else {
      addToWatchlist(current);
      setInList(true);
    }
  };

  const watchUrl = current.contentType === 'movie'
    ? `/watch/movie/${current.id}`
    : `/watch/tv/${current.id}/${current.seasons?.[0]?.episodes?.[0]?.id || 's1e1'}`;

  const detailUrl = current.contentType === 'movie'
    ? `/movie/${current.slug}`
    : `/tv/${current.slug}`;

  const fallbackBackdrop = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80';
  const [backdropSrc, setBackdropSrc] = useState(current.backdropUrl || fallbackBackdrop);

  useEffect(() => {
    setBackdropSrc(current.backdropUrl || fallbackBackdrop);
  }, [current.backdropUrl]);

  return (
    <div className="relative w-full h-[70vh] sm:h-[75vh] lg:h-[85vh] min-h-[500px] max-h-[850px] overflow-hidden select-none">
      {/* Background Backdrop Image with smooth crossfade */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backdropSrc}
          alt={current.title}
          fill
          priority
          sizes="100vw"
          onError={() => setBackdropSrc(fallbackBackdrop)}
          className="object-cover object-center filter brightness-[0.75] transition-all duration-1000 scale-100 group-hover:scale-105"
        />

        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      {/* Hero Content Information */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-6 md:px-12 flex flex-col justify-end pb-12 sm:pb-16 md:pb-20 max-w-2xl lg:max-w-3xl space-y-4">
        {/* Badges & Meta */}
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <Badge variant="primary" size="sm" className="font-bold">
            Featured {current.contentType.toUpperCase()}
          </Badge>

          <Badge variant="rating" size="sm" className="flex items-center gap-1">
            <IconStar className="w-3 h-3 text-amber-300" variant="Bold" />
            {current.rating}
          </Badge>

          {current.ageRating && (
            <Badge variant="outline" size="sm">
              {current.ageRating}
            </Badge>
          )}

          {current.quality && (
            <Badge variant="quality" size="sm">
              {current.quality}
            </Badge>
          )}

          <span className="text-xs text-slate-300 font-medium ml-1">
            {current.year}
            {current.runtime ? ` • ${formatDuration(current.runtime)}` : ''}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md line-clamp-2">
          {current.title}
        </h1>

        {/* Genres Pill list */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          {current.genres.map((g) => (
            <span
              key={g.id}
              className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10"
            >
              {g.name}
            </span>
          ))}
        </div>

        {/* Synopsis */}
        <p className="text-sm sm:text-base text-slate-200 line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
          {current.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href={watchUrl}>
            <Button
              variant="primary"
              size="lg"
              className="flex items-center gap-2 px-6 shadow-xl shadow-primary/30"
              aria-label={`Watch ${current.title} Now`}
            >
              <IconPlay className="w-5 h-5 text-white" variant="Bold" />
              Watch Now
            </Button>
          </Link>

          <Button
            variant={inList ? 'accent' : 'secondary'}
            size="lg"
            onClick={handleWatchlistToggle}
            className="flex items-center gap-2 px-5"
            aria-label={inList ? 'Remove from My List' : 'Add to My List'}
          >
            {inList ? (
              <>
                <IconCheck className="w-5 h-5" />
                In My List
              </>
            ) : (
              <>
                <IconPlus className="w-5 h-5" />
                Add to My List
              </>
            )}
          </Button>

          <Button
            variant="glass"
            size="lg"
            onClick={() => onOpenInfo ? onOpenInfo(current) : null}
            className="flex items-center gap-2 px-5"
            aria-label="More Info"
          >
            <IconInfoCircle className="w-5 h-5" />
            More Info
          </Button>
        </div>
      </div>

      {/* Hero Carousel Navigation Indicators (Bottom Right) */}
      {featuredItems.length > 1 && (
        <div className="absolute bottom-6 right-4 sm:right-12 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length)
            }
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Previous featured title"
          >
            <IconChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            {featuredItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-white/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setCurrentIndex((prev) => (prev + 1) % featuredItems.length)
            }
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Next featured title"
          >
            <IconChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
