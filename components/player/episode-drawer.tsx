'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconClose, IconPlay } from '@/components/ui/icons';
import { Season, Episode } from '@/types/content';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EpisodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  seasons: Season[];
  currentEpisodeId?: string;
}

export function EpisodeDrawer({
  isOpen,
  onClose,
  contentId,
  seasons,
  currentEpisodeId,
}: EpisodeDrawerProps) {
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);

  if (!isOpen) return null;

  const currentSeason =
    seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-6 flex flex-col animate-fade-in text-foreground">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white">Episodes</h3>
          <p className="text-xs text-slate-400">Select an episode to stream</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close episodes drawer"
          className="rounded-full h-8 w-8 text-slate-400 hover:text-white"
        >
          <IconClose className="w-5 h-5" />
        </Button>
      </div>

      {/* Season Selector Tabs */}
      {seasons.length > 1 && (
        <div className="flex items-center gap-2 py-3 overflow-x-auto border-b border-white/10">
          {seasons.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                selectedSeasonNumber === s.seasonNumber
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {s.title || `Season ${s.seasonNumber}`}
            </button>
          ))}
        </div>
      )}

      {/* Episode List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {currentSeason?.episodes.map((ep) => {
          const isCurrent = ep.id === currentEpisodeId;
          const watchUrl = `/watch/tv/${contentId}/${ep.id}`;

          return (
            <Link
              key={ep.id}
              href={watchUrl}
              onClick={onClose}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-primary/20 border-primary shadow-inner'
                  : 'bg-white/5 hover:bg-white/10 border-white/5'
              }`}
            >
              <div className="relative aspect-video w-24 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                <Image
                  src={ep.thumbnailUrl}
                  alt={ep.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <IconPlay
                    className={`w-3.5 h-3.5 ${isCurrent ? 'text-primary' : 'text-white'}`}
                    variant="Bold"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">
                    {ep.title && (ep.title.toLowerCase().startsWith('chapter') || ep.title.toLowerCase().startsWith('episode'))
                      ? ep.title
                      : `${ep.episodeNumber}. ${ep.title}`}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                      Playing
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {formatDuration(ep.runtime)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
