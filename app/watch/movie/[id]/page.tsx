'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { notFound, useSearchParams } from 'next/navigation';
import { ArrowLeft, Share2, Plus, Check, Star } from 'lucide-react';
import { VideoPlayer } from '@/components/player/video-player';
import { ContentRow } from '@/components/rows/content-row';
import { ShareDialog } from '@/components/share/share-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { OpenSourceProvider } from '@/lib/providers/open-source-provider';
import { StreamSource } from '@/types/providers';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist, getStoredHistory } from '@/lib/storage/local-storage-store';

function WatchMovieContent({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const timeParam = searchParams.get('t');

  const movie = SEED_CONTENT.find(
    (c) => (c.id === params.id || c.slug === params.id) && c.contentType === 'movie'
  );

  const [streams, setStreams] = useState<StreamSource[]>([]);
  const [initialTime, setInitialTime] = useState<number>(0);
  const [inList, setInList] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!movie) return;
    setInList(isInWatchlist(movie.id));

    // Resolve streams from provider
    const provider = new OpenSourceProvider();
    provider.getStreams(movie.id).then((resolved) => {
      setStreams(resolved);
    });

    // Check query param or history for initial resume position
    if (timeParam) {
      setInitialTime(parseInt(timeParam, 10));
    } else {
      const history = getStoredHistory();
      const match = history.find((h) => h.contentId === movie.id);
      if (match && match.positionSeconds > 0 && !match.completed) {
        setInitialTime(match.positionSeconds);
      }
    }
  }, [movie, timeParam]);

  if (!movie) {
    notFound();
  }

  const handleWatchlistToggle = () => {
    if (inList) {
      removeFromWatchlist(movie.id);
      setInList(false);
    } else {
      addToWatchlist(movie);
      setInList(true);
    }
  };

  const related = SEED_CONTENT.filter(
    (c) => c.id !== movie.id && c.contentType === 'movie'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 space-y-8">
      {/* Back button & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/movie/${movie.slug}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Details
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant={inList ? 'accent' : 'secondary'}
            size="sm"
            onClick={handleWatchlistToggle}
            className="flex items-center gap-1.5 text-xs"
          >
            {inList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {inList ? 'Saved to List' : 'Add to List'}
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Main HTML5 Video Player Container */}
      <div className="w-full">
        <VideoPlayer
          content={movie}
          streams={streams}
          initialTime={initialTime}
        />
      </div>

      {/* Movie Information below player */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{movie.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <Badge variant="rating" size="sm" className="flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-300" />
                {movie.rating}
              </Badge>
              <span>{movie.year}</span>
              {movie.runtime && <span>• {formatDuration(movie.runtime)}</span>}
              {movie.quality && <span>• {movie.quality} Ultra HD</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {movie.genres.map((g) => (
              <span
                key={g.id}
                className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-slate-300 border border-white/5"
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
          {movie.description}
        </p>

        {movie.cast && movie.cast.length > 0 && (
          <div className="text-xs text-slate-400 pt-2">
            <span className="font-semibold text-slate-300 mr-2">Starring:</span>
            {movie.cast.join(', ')}
          </div>
        )}
      </div>

      {/* Related Content */}
      <div className="pt-8">
        <ContentRow
          title="Recommended Movies"
          items={related}
        />
      </div>

      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        content={movie}
      />
    </div>
  );
}

export default function WatchMoviePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading Player...</div>}>
      <WatchMovieContent params={params} />
    </Suspense>
  );
}
