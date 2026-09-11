'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, X } from 'lucide-react';
import { WatchHistoryItem } from '@/types/user';
import { calculateProgressPercentage, formatSeconds } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ContinueWatchingCardProps {
  item: WatchHistoryItem;
  onRemove?: (contentId: string) => void;
}

export function ContinueWatchingCard({ item, onRemove }: ContinueWatchingCardProps) {
  const { content, episode, positionSeconds, durationSeconds } = item;
  const progressPercent = calculateProgressPercentage(positionSeconds, durationSeconds);

  const watchUrl = episode
    ? `/watch/tv/${content.id}/${episode.id}?t=${positionSeconds}`
    : `/watch/movie/${content.id}?t=${positionSeconds}`;

  const imageSrc = episode?.thumbnailUrl || content.backdropUrl || content.posterUrl;

  return (
    <div className="group relative flex-shrink-0 w-64 sm:w-72 md:w-80 select-none">
      <Link href={watchUrl} className="block w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card border border-white/10 shadow-lg group-hover:border-primary/50 group-hover:scale-[1.02] transition-all duration-300">
          <Image
            src={imageSrc}
            alt={content.title}
            fill
            sizes="(max-width: 640px) 256px, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Dark Overlay with Play Icon */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>

          {/* Dismiss button */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(content.id);
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-slate-400 hover:text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove from history"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Progress Bar at bottom of card */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Content Details & Resume text */}
        <div className="mt-2.5 px-1 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
              {content.title}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {episode ? `${episode.title}` : `Movie • ${formatSeconds(positionSeconds)} watched`}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {progressPercent}%
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
