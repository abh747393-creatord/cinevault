'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Plus, Check, Info, Star } from 'lucide-react';
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

export function ContentCard({
  content,
  priority = false,
  onOpenInfo,
  className,
}: ContentCardProps) {
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
    : `/watch/tv/${content.id}/ep-oc-101`;

  return (
    <div
      className={cn(
        'group relative flex-shrink-0 w-36 sm:w-44 md:w-52 select-none transition-all duration-300',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={detailUrl} className="block w-full">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-card border border-white/10 shadow-lg group-hover:shadow-2xl group-hover:border-primary/50 group-hover:scale-[1.03] transition-all duration-300">
          <Image
            src={content.posterUrl}
            alt={content.title}
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 208px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <Badge variant="rating" size="sm" className="shadow-md flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-amber-300" />
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
              'hidden md:flex absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 flex-col justify-end transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={watchUrl}
                onClick={(e) => e.stopPropagation()}
                className="flex-1"
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full flex items-center justify-center gap-1.5 h-8 text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Play
                </Button>
              </Link>

              <Button
                variant={inList ? 'accent' : 'glass'}
                size="icon"
                onClick={handleWatchlistToggle}
                className="h-8 w-8 rounded-lg"
                title={inList ? 'Remove from My List' : 'Add to My List'}
              >
                {inList ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-white" />
                )}
              </Button>

              <Button
                variant="glass"
                size="icon"
                onClick={handleInfoClick}
                className="h-8 w-8 rounded-lg"
                title="More Information"
              >
                <Info className="w-3.5 h-3.5 text-slate-200" />
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
        <div className="mt-2 px-1">
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
        </div>
      </Link>
    </div>
  );
}
