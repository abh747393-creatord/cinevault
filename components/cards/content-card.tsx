'use client';

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconPlay, IconPlus, IconCheck, IconInfoCircle, IconStar } from '@/components/ui/icons';
import { ContentItem } from '@/types/content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  content: ContentItem;
  priority?: boolean;
  onOpenInfo?: (content: ContentItem) => void;
  className?: string;
}

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';

export const ContentCard = memo(function ContentCard({
  content,
  priority = false,
  onOpenInfo,
  className,
}: ContentCardProps) {
  const router = useRouter();
  const [inList, setInList] = useState(() => isInWatchlist(content.id));
  const [isHovered, setIsHovered] = useState(false);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inList) {
      removeFromWatchlist(content.id);
      setInList(false);
    } else {
      addToWatchlist(content);
      setInList(true);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    if (onOpenInfo) {
      e.preventDefault();
      e.stopPropagation();
      onOpenInfo(content);
    }
  };

  const detailUrl = content.contentType === 'movie'
    ? `/movie/${content.slug}`
    : `/tv/${content.slug}`;

  const watchUrl = content.contentType === 'movie'
    ? `/watch/movie/${content.id}`
    : `/watch/tv/${content.id}/${content.seasons?.[0]?.episodes?.[0]?.id || 's1e1'}`;

  return (
    <div
      className={cn(
        'group relative flex-shrink-0 w-36 sm:w-44 md:w-52 select-none',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-900/60 border border-white/10 shadow-lg group-hover:shadow-2xl group-hover:border-primary/50 transition-transform duration-300 group-hover:scale-[1.02]">
        <Link
          href={detailUrl}
          prefetch={false}
          className="absolute inset-0 z-0 block cursor-pointer"
          aria-label={content.title}
        >
          <img
            src={content.posterUrl || FALLBACK_POSTER}
            alt={content.title}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_POSTER) {
                e.currentTarget.src = FALLBACK_POSTER;
              }
            }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <Badge variant="rating" size="sm" className="shadow-md flex items-center gap-1">
            <IconStar className="w-2.5 h-2.5 text-amber-300" variant="Bold" />
            {content.rating}
          </Badge>

          {content.quality && (
            <Badge variant="quality" size="sm" className="bg-black/60 shadow-md">
              {content.quality}
            </Badge>
          )}
        </div>

        {/* Desktop Hover Overlay */}
        <div
          className={cn(
            'hidden md:flex absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 flex-col justify-end transition-opacity duration-200 z-10',
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-2 relative z-20">
            <Link
              href={watchUrl}
              prefetch={false}
              className="flex-1"
            >
              <Button
                variant="primary"
                size="sm"
                className="w-full flex items-center justify-center gap-1.5 h-8 text-xs font-bold"
                aria-label={`Play ${content.title}`}
              >
                <IconPlay className="w-3.5 h-3.5 text-white" variant="Bold" />
                Play
              </Button>
            </Link>

            <Button
              variant={inList ? 'accent' : 'glass'}
              size="icon"
              onClick={handleWatchlistToggle}
              className="h-8 w-8 rounded-lg"
              title={inList ? 'Remove from My List' : 'Add to My List'}
              aria-label={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? (
                <IconCheck className="w-3.5 h-3.5 text-white" />
              ) : (
                <IconPlus className="w-3.5 h-3.5 text-white" />
              )}
            </Button>

            <Button
              variant="glass"
              size="icon"
              onClick={handleInfoClick}
              className="h-8 w-8 rounded-lg"
              title="More Information"
              aria-label="More Information"
            >
              <IconInfoCircle className="w-3.5 h-3.5 text-slate-200" />
            </Button>
          </div>

          {/* Quick Genres */}
          <div className="flex flex-wrap gap-1 text-[10px] text-slate-300">
            {content.genres.slice(0, 2).map((g) => (
              <span key={g.id} className="bg-white/10 px-1.5 py-0.5 rounded">
                {g.name}
              </span>
            ))}
            <span className="text-slate-400 self-center ml-auto font-medium">
              {content.year}
            </span>
          </div>
        </div>
      </div>

      {/* Title & Metadata below card */}
      <Link href={detailUrl} prefetch={false} className="mt-2 px-1 block group">
        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
          {content.title}
        </h4>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
          <span>{content.year}</span>
          <span>•</span>
          <span className="capitalize">{content.contentType}</span>
          {content.runtime && (
            <>
              <span>•</span>
              <span>{content.runtime}m</span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
});
