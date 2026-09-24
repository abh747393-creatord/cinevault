'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconShare,
  IconPlus,
  IconCheck,
  IconStar,
  IconArrowRightUp,
  IconClapperboardPlay,
  IconInfoCircle,
} from '@/components/ui/icons';
import { VideoPlayer } from '@/components/player/video-player';
import { ContentRow } from '@/components/rows/content-row';
import { ShareDialog } from '@/components/share/share-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { providerResolver } from '@/lib/providers/resolver';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { StreamSource } from '@/types/providers';
import { ContentItem } from '@/types/content';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist, getStoredHistory } from '@/lib/storage/local-storage-store';

function WatchMovieContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeParam = searchParams.get('t');

  const [movie, setMovie] = useState<ContentItem | null>(null);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingMovie(true);

    providerResolver.resolveMovie(params.id).then(async (resolved) => {
      if (isMounted) {
        if (!resolved) {
          try {
            const tvItem = await providerResolver.resolveTvShow(params.id);
            if (tvItem && isMounted) {
              const firstEp = tvItem.seasons?.[0]?.episodes?.[0]?.id || 's1e1';
              router.replace(`/watch/tv/${params.id}/${firstEp}`);
              return;
            }
          } catch {}
        }
        setMovie(resolved);
        setLoadingMovie(false);

        if (resolved) {
          movieboxApi.homepage('movie', 1).then((data) => {
            if (!isMounted) return;
            if (data?.items) {
              const mapped: ContentItem[] = data.items
                .filter((item) => item.id.value !== resolved.id.replace(/^mb-/, '') && item.title !== resolved.title)
                .slice(0, 10)
                .map((item) => ({
                  id: `mb-${item.id.value}`,
                  externalId: item.id.value,
                  title: item.title,
                  description: `${item.title} (${item.year || 'Feature Film'})`,
                  contentType: 'movie',
                  genres: [{ id: 'g-movie', name: 'Movie', slug: 'movie' }],
                  releaseDate: item.year ? `${item.year}-01-01` : '',
                  year: item.year ? parseInt(item.year, 10) || 2024 : 2024,
                  posterUrl: item.poster_url || '/images/neutral-poster.svg',
                  backdropUrl: item.poster_url || '/images/neutral-backdrop.svg',
                  slug: `mb-${item.id.value}`,
                  language: 'English',
                  status: 'released',
                }));
              setRelated(mapped);
            }
          }).catch(() => {});
        }
      }
    }).catch(() => {
      if (isMounted) setLoadingMovie(false);
    });

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const [streams, setStreams] = useState<StreamSource[]>([]);
  const [loadingStreams, setLoadingStreams] = useState<boolean>(true);
  const [initialTime, setInitialTime] = useState<number>(0);
  const [inList, setInList] = useState<boolean>(false);
  const [related, setRelated] = useState<ContentItem[]>([]);

  useEffect(() => {
    if (!movie) return;
    setInList(isInWatchlist(movie.id));

    let isCancelled = false;
    setLoadingStreams(true);
    // Resolve streams from provider system
    providerResolver
      .resolveStreams(movie.id)
      .then((resolved) => {
        if (!isCancelled) {
          setStreams(resolved || []);
          setLoadingStreams(false);
        }
      })
      .catch((err) => {
        console.warn('[WatchMoviePage] Stream resolution failed:', err);
        if (!isCancelled) {
          setStreams([]);
          setLoadingStreams(false);
        }
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

    return () => {
      isCancelled = true;
    };
  }, [movie, timeParam]);

  if (loadingMovie) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading movie stream...</p>
      </div>
    );
  }

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

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-12 py-4 sm:py-6 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Back button & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/movie/${movie.slug || movie.id}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          Back to Details
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant={inList ? 'accent' : 'secondary'}
            size="sm"
            onClick={handleWatchlistToggle}
            className="flex items-center gap-1.5 text-xs"
            aria-label={inList ? 'Saved to List' : 'Add to List'}
          >
            {inList ? <IconCheck className="w-3.5 h-3.5" /> : <IconPlus className="w-3.5 h-3.5" />}
            {inList ? 'Saved to List' : 'Add to List'}
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs"
            aria-label="Share movie"
          >
            <IconShare className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Main HTML5 Video Player Container */}
      <div className="w-full max-w-full overflow-hidden">
        <VideoPlayer
          content={movie}
          streams={streams}
          isLoadingStreams={loadingStreams}
          initialTime={initialTime}
        />
      </div>

      {/* Official Movie Links & Direct External Sources */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card/70 border border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <IconClapperboardPlay className="w-3.5 h-3.5 text-primary" />
            Direct Movie Links:
          </span>

          {movie.youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>🔴</span>
              Watch on YouTube
              <IconArrowRightUp className="w-3.5 h-3.5 ml-0.5" />
            </a>
          )}

          {movie.externalId?.startsWith('imdb-') && (
            <a
              href={`https://www.imdb.com/title/${movie.externalId.replace('imdb-', '')}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>⭐</span>
              IMDb Title & Rating
              <IconArrowRightUp className="w-3.5 h-3.5 ml-0.5" />
            </a>
          )}
        </div>
      </div>

      {streams.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-card border border-red-500/20 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">CineVault Ultra Stream Active</span>
            <span className="text-slate-400 hidden sm:inline">• High-Definition HTTP 206 Direct Range Stream</span>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            CINEVAULT VIP
          </span>
        </div>
      )}

      {/* Movie Information below player */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{movie.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              {movie.rating !== undefined && movie.rating > 0 && (
                <Badge variant="rating" size="sm" className="flex items-center gap-1">
                  <IconStar className="w-2.5 h-2.5 text-amber-300" variant="Bold" />
                  {movie.rating.toFixed(1)}
                </Badge>
              )}
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>• {formatDuration(movie.runtime)}</span>}
              {movie.quality && <span>• {movie.quality}</span>}
            </div>
          </div>

          {movie.genres && movie.genres.length > 0 && (
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
          )}
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
      {related.length > 0 && (
        <div className="pt-8">
          <ContentRow
            title="Recommended Movies"
            items={related}
          />
        </div>
      )}

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
