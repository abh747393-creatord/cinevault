'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, notFound, useSearchParams } from 'next/navigation';
import { ArrowLeft, List, SkipForward, SkipBack } from 'lucide-react';
import { VideoPlayer } from '@/components/player/video-player';
import { EpisodeDrawer } from '@/components/player/episode-drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { OpenSourceProvider } from '@/lib/providers/open-source-provider';
import { StreamSource } from '@/types/providers';
import { Episode, Season } from '@/types/content';
import { getStoredHistory } from '@/lib/storage/local-storage-store';

function WatchTvContent({
  params,
}: {
  params: { id: string; episode: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeParam = searchParams.get('t');

  const show = SEED_CONTENT.find(
    (c) => (c.id === params.id || c.slug === params.id) && (c.contentType === 'tv' || c.contentType === 'anime')
  );

  const [streams, setStreams] = useState<StreamSource[]>([]);
  const [initialTime, setInitialTime] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  let currentEpisode: Episode | undefined = undefined;
  let currentSeason: Season | undefined = undefined;

  if (show?.seasons) {
    for (const s of show.seasons) {
      const ep = s.episodes.find((e) => e.id === params.episode);
      if (ep) {
        currentEpisode = ep;
        currentSeason = s;
        break;
      }
    }
  }

  if (!currentEpisode && show?.seasons?.[0]?.episodes?.[0]) {
    currentEpisode = show.seasons[0].episodes[0];
    currentSeason = show.seasons[0];
  }

  const allEpisodes = show?.seasons?.flatMap((s) => s.episodes) || [];
  const currentIndex = allEpisodes.findIndex((e) => e.id === currentEpisode?.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : undefined;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : undefined;

  useEffect(() => {
    if (!show || !currentEpisode) return;

    const provider = new OpenSourceProvider();
    provider.getStreams(show.id, currentEpisode.id).then((resolved) => {
      setStreams(resolved);
    });

    if (timeParam) {
      setInitialTime(parseInt(timeParam, 10));
    } else {
      const history = getStoredHistory();
      const match = history.find((h) => h.contentId === show.id && h.episodeId === currentEpisode?.id);
      if (match && match.positionSeconds > 0 && !match.completed) {
        setInitialTime(match.positionSeconds);
      }
    }
  }, [show, currentEpisode, timeParam]);

  if (!show || !currentEpisode) {
    notFound();
  }

  const handleNext = () => {
    if (nextEpisode) {
      router.push(`/watch/tv/${show.id}/${nextEpisode.id}`);
    }
  };

  const handlePrev = () => {
    if (prevEpisode) {
      router.push(`/watch/tv/${show.id}/${prevEpisode.id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/tv/${show.slug}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Series Details
        </Link>

        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold"
        >
          <List className="w-4 h-4 text-primary" />
          Episodes ({allEpisodes.length})
        </Button>
      </div>

      <div className="w-full">
        <VideoPlayer
          content={show}
          streams={streams}
          episode={currentEpisode}
          initialTime={initialTime}
          onNextEpisode={nextEpisode ? handleNext : undefined}
          onPrevEpisode={prevEpisode ? handlePrev : undefined}
          onToggleEpisodeDrawer={() => setIsDrawerOpen(true)}
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevEpisode}
            onClick={handlePrev}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <SkipBack className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={!nextEpisode}
            onClick={handleNext}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            Next Episode
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400 font-medium">
            {currentSeason?.title || `Season ${currentSeason?.seasonNumber}`}
          </p>
          <p className="text-sm font-bold text-white">
            EP {currentEpisode.episodeNumber}: {currentEpisode.title}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h2 className="text-xl font-bold text-white">{currentEpisode.title}</h2>
        <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
          {currentEpisode.description}
        </p>
      </div>

      {show.seasons && (
        <EpisodeDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          contentId={show.id}
          seasons={show.seasons}
          currentEpisodeId={currentEpisode.id}
        />
      )}
    </div>
  );
}

export default function WatchTvPage({
  params,
}: {
  params: { id: string; episode: string };
}) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading Episode...</div>}>
      <WatchTvContent params={params} />
    </Suspense>
  );
}
