'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, CheckCircle } from 'lucide-react';
import { Episode } from '@/types/content';
import { formatDuration } from '@/lib/utils';

interface EpisodeCardProps {
  contentId: string;
  episode: Episode;
  isWatched?: boolean;
}

export function EpisodeCard({ contentId, episode, isWatched = false }: EpisodeCardProps) {
  const watchUrl = `/watch/tv/${contentId}/${episode.id}`;

  return (
    <Link
      href={watchUrl}
      className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/40 transition-all select-none"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full sm:w-44 flex-shrink-0 overflow-hidden rounded-xl bg-card border border-white/10">
        <Image
          src={episode.thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'}
          alt={episode.title}
          fill
          sizes="(max-width: 640px) 100vw, 176px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-200">
          {formatDuration(episode.runtime)}
        </div>
      </div>

      {/* Episode Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">EP {episode.episodeNumber}</span>
          <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-primary transition-colors truncate">
            {episode.title}
          </h4>
          {isWatched && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-auto">
              <CheckCircle className="w-3.5 h-3.5" />
              Watched
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {episode.description}
        </p>
      </div>
    </Link>
  );
}
