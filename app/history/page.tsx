'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Play, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { WatchHistoryItem } from '@/types/user';
import { getStoredHistory, clearHistory } from '@/lib/storage/local-storage-store';
import { calculateProgressPercentage, formatSeconds } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your entire watch history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" />
            Watch History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your viewing activity and resume streaming where you left off.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All History
          </Button>
        )}
      </div>

      {/* History Items List */}
      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item) => {
            const progress = calculateProgressPercentage(item.positionSeconds, item.durationSeconds);
            const watchUrl = item.episode
              ? `/watch/tv/${item.content.id}/${item.episode.id}?t=${item.positionSeconds}`
              : `/watch/movie/${item.content.id}?t=${item.positionSeconds}`;

            return (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-white/10 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Thumbnail / Poster */}
                  <div className="relative aspect-video w-32 sm:w-40 rounded-xl overflow-hidden bg-black flex-shrink-0">
                    <Image
                      src={item.episode?.thumbnailUrl || item.content.backdropUrl || item.content.posterUrl}
                      alt={item.content.title}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                    {/* Tiny bottom progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                      {item.content.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      {item.episode ? `EP ${item.episode.episodeNumber}: ${item.episode.title}` : 'Feature Movie'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>{formatSeconds(item.positionSeconds)} of {formatSeconds(item.durationSeconds)}</span>
                      <span>•</span>
                      <span>{progress}% watched</span>
                      {item.completed && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resume Button */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link href={watchUrl}>
                    <Button variant="primary" size="sm" className="flex items-center gap-1.5 px-4 text-xs">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      {item.completed ? 'Watch Again' : 'Resume'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 bg-white/5 rounded-2xl border border-white/5 max-w-md mx-auto">
          <Clock className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No viewing history yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Your watched movies and TV episodes will automatically appear here with progress tracking.
          </p>
          <Link href="/">
            <Button variant="primary" size="sm" className="gap-2">
              Start Streaming
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
