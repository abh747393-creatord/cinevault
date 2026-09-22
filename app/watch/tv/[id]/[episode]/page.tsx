'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconList,
  IconSkipNext,
  IconSkipPrevious,
  IconPlay,
  IconCheck,
  IconPlus,
  IconShare,
  IconStar,
  IconClockCircle,
  IconTV,
  IconAlertCircle,
} from '@/components/ui/icons';
import { VideoPlayer } from '@/components/player/video-player';
import { EpisodeDrawer } from '@/components/player/episode-drawer';
import { ContentRow } from '@/components/rows/content-row';
import { ShareDialog } from '@/components/share/share-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { providerResolver } from '@/lib/providers/resolver';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { StreamSource } from '@/types/providers';
import { Episode, Season, ContentItem } from '@/types/content';
import {
  getStoredHistory,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from '@/lib/storage/local-storage-store';

function WatchTvContent({
  params,
}: {
  params: { id: string; episode: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeParam = searchParams.get('t');

  const [show, setShow] = useState<ContentItem | null>(null);
  const [loadingShow, setLoadingShow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<StreamSource[]>([]);
  const [initialTime, setInitialTime] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showShare, setShowShare] = useState<boolean>(false);
  const [inList, setInList] = useState<boolean>(false);
  const [relatedShows, setRelatedShows] = useState<ContentItem[]>([]);

  const loadTvShow = useCallback(async () => {
    setLoadingShow(true);
    setError(null);

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 8000)
    );

    try {
      const resolved = await Promise.race([
        providerResolver.resolveTvShow(params.id),
        timeoutPromise,
      ]);

      if (resolved) {
        if (resolved.contentType === 'movie') {
          router.replace(`/watch/movie/${params.id}`);
          return;
        }
        setShow(resolved);
        setError(null);

        // Fetch real related shows
        movieboxApi.homepage('tv', 1).then((data) => {
          if (data?.items) {
            const mapped: ContentItem[] = data.items
              .filter((item) => item.id.value !== resolved.id.replace(/^mb-/, '') && item.title !== resolved.title)
              .slice(0, 10)
              .map((item) => ({
                id: `mb-${item.id.value}`,
                externalId: item.id.value,
                title: item.title,
                description: `${item.title} (${item.year || 'TV Series'})`,
                contentType: 'tv',
                genres: [{ id: 'g-tv', name: 'TV Series', slug: 'tv' }],
                releaseDate: item.year ? `${item.year}-01-01` : '',
                year: item.year ? parseInt(item.year, 10) || 2024 : 2024,
                posterUrl: item.poster_url || '/images/neutral-poster.svg',
                backdropUrl: item.poster_url || '/images/neutral-backdrop.svg',
                slug: `mb-${item.id.value}`,
                language: 'English',
                status: 'released',
              }));
            setRelatedShows(mapped);
          }
        }).catch(() => {});
      } else {
        // Check if this ID is actually a movie
        try {
          const movieItem = await providerResolver.resolveMovie(params.id);
          if (movieItem) {
            router.replace(`/watch/movie/${params.id}`);
            return;
          }
        } catch {}
        setError('TV show details unavailable.');
      }
    } catch (err: any) {
      console.warn('[WatchTvPage] Failed to resolve TV show:', err);
      if (err?.message === 'Request timed out') {
        setError('Unable to load TV show. Request timed out.');
      } else {
        setError('Unable to load TV show. Please check your connection.');
      }
    } finally {
      setLoadingShow(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadTvShow();
  }, [loadTvShow]);

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
  const nextEpisode =
    currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : undefined;

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    currentSeason?.seasonNumber || 1
  );

  useEffect(() => {
    if (currentSeason?.seasonNumber) {
      setSelectedSeasonNumber(currentSeason.seasonNumber);
    }
  }, [currentSeason?.seasonNumber]);

  useEffect(() => {
    if (show) {
      setInList(isInWatchlist(show.id));
    }
  }, [show]);

  useEffect(() => {
    if (!show || !currentEpisode) return;

    providerResolver.resolveStreams(show.id, currentEpisode.id).then((resolved) => {
      setStreams(resolved);
    });

    if (timeParam) {
      setInitialTime(parseInt(timeParam, 10));
    } else {
      const history = getStoredHistory();
      const match = history.find(
        (h) => h.contentId === show.id && h.episodeId === currentEpisode?.id
      );
      if (match && match.positionSeconds > 0 && !match.completed) {
        setInitialTime(match.positionSeconds);
      }
    }
  }, [show?.id, currentEpisode?.id, timeParam]);

  if (loadingShow) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading TV show stream...</p>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card/60 backdrop-blur-md border border-white/10 space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <IconAlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">Unable to load TV show</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {error || 'TV show details unavailable.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={loadTvShow}
              className="text-xs font-semibold px-5"
            >
              Retry
            </Button>
            <Link href="/tv">
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                Browse TV Shows
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentEpisode) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card/60 backdrop-blur-md border border-white/10 space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <IconAlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">Episode Unavailable</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              No playable episodes were found for this series.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href={`/watch/movie/${params.id}`}>
              <Button variant="primary" size="sm" className="text-xs font-semibold">
                Play as Movie
              </Button>
            </Link>
            <Link href={show ? `/tv/${show.slug}` : '/tv'}>
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                View Series Details
              </Button>
            </Link>
            <Link href="/tv">
              <Button variant="glass" size="sm" className="text-xs font-semibold">
                Browse TV Shows
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
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

  const handleWatchlistToggle = () => {
    if (!show) return;
    if (inList) {
      removeFromWatchlist(show.id);
      setInList(false);
    } else {
      addToWatchlist(show);
      setInList(true);
    }
  };

  const activeSeason =
    show.seasons?.find((s) => s.seasonNumber === selectedSeasonNumber) ||
    currentSeason ||
    show.seasons?.[0];

  const seasonEpisodes = activeSeason?.episodes || [];

  const fallbackPoster = '/images/neutral-poster.svg';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-12 py-4 sm:py-6 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/tv/${show.slug}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          Back to Series Details
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant={inList ? 'accent' : 'secondary'}
            size="sm"
            onClick={handleWatchlistToggle}
            className="flex items-center gap-1.5 text-xs"
          >
            {inList ? <IconCheck className="w-3.5 h-3.5" /> : <IconPlus className="w-3.5 h-3.5" />}
            {inList ? 'Saved to List' : 'Add to List'}
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <IconShare className="w-3.5 h-3.5" />
            Share
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <IconList className="w-4 h-4 text-primary" />
            All Episodes ({allEpisodes.length})
          </Button>
        </div>
      </div>

      {/* Main HTML5 Video Player Container */}
      <div className="w-full max-w-full overflow-hidden">
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

      {/* CineVault Ultra VIP Streaming Status Banner */}
      {streams.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-card border border-red-500/20 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">CineVault Ultra Stream Active</span>
            <span className="text-slate-400 hidden sm:inline">
              • High-Definition HTTP 206 Direct Range Stream
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            CINEVAULT VIP
          </span>
        </div>
      )}

      {/* Episode Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevEpisode}
            onClick={handlePrev}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <IconSkipPrevious className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={!nextEpisode}
            onClick={handleNext}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 shadow-md"
          >
            Next Episode
            <IconSkipNext className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-400 font-medium">
            {currentSeason?.title || `Season ${currentSeason?.seasonNumber}`}
          </p>
          <p className="text-sm font-bold text-white">
            EP {currentEpisode.episodeNumber}: {currentEpisode.title}
          </p>
        </div>
      </div>

      {/* Series & Current Episode Information Card */}
      <div className="rounded-3xl border border-white/10 bg-card/60 p-6 sm:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Show Poster */}
          <div className="w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border border-white/10 shrink-0 bg-black/40 relative">
            <img
              src={show.posterUrl || fallbackPoster}
              alt={show.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackPoster;
              }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary text-white">
                {show.contentType === 'anime' ? 'ANIME' : 'TV SERIES'}
              </span>
              {show.rating !== undefined && show.rating > 0 && (
                <Badge variant="rating" size="sm" className="flex items-center gap-1">
                  <IconStar className="w-3 h-3 fill-amber-300" />
                  {show.rating.toFixed(1)}
                </Badge>
              )}
              {show.quality && <Badge variant="quality" size="sm">{show.quality}</Badge>}
              {show.year && (
                <Badge variant="outline" size="sm">
                  {show.year}
                </Badge>
              )}
              {show.ageRating && <Badge variant="outline" size="sm">{show.ageRating}</Badge>}
              <span className="text-xs text-slate-400 font-medium">
                {show.seasons?.length || 1} Season{(show.seasons?.length || 1) > 1 ? 's' : ''} • {allEpisodes.length} Episodes
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              <Link href={`/tv/${show.slug}`} className="hover:text-primary transition-colors">
                {show.title}
              </Link>
            </h1>

            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Now Watching:
                </span>
                <span className="text-xs font-semibold text-white">
                  Season {currentSeason?.seasonNumber} Episode {currentEpisode.episodeNumber}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">{currentEpisode.title}</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                {currentEpisode.description || show.description}
              </p>
            </div>

            {/* Audio Dubs & Subtitles pills */}
            {show.availableAudio && show.availableAudio.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Available Audio:</span>
                {show.availableAudio.map((aud) => (
                  <span
                    key={aud}
                    className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[11px]"
                  >
                    {aud}
                  </span>
                ))}
              </div>
            )}

            {/* Cast & Director */}
            <div className="pt-2 flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-400 border-t border-white/5">
              {show.director && (
                <div>
                  <span className="text-slate-500">Creator:</span>{' '}
                  <span className="text-slate-300 font-medium">{show.director}</span>
                </div>
              )}
              {show.cast && show.cast.length > 0 && (
                <div>
                  <span className="text-slate-500">Starring:</span>{' '}
                  <span className="text-slate-300 font-medium">
                    {show.cast.slice(0, 4).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Seasons & Episodes Selector Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <IconTV className="w-5 h-5 text-primary" />
            <h3 className="text-lg sm:text-xl font-black text-white">
              Episodes & Seasons
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {seasonEpisodes.length} episodes in {activeSeason?.title || `Season ${selectedSeasonNumber}`}
          </span>
        </div>

        {/* Season Selector Tabs */}
        {show.seasons && show.seasons.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {show.seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  selectedSeasonNumber === s.seasonNumber
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.title || `Season ${s.seasonNumber}`} ({s.episodes?.length || 0})
              </button>
            ))}
          </div>
        )}

        {/* Episodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
          {seasonEpisodes.map((ep) => {
            const isCurrent = ep.id === currentEpisode.id;
            return (
              <div
                key={ep.id}
                onClick={() => router.push(`/watch/tv/${show.id}/${ep.id}`)}
                className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
                  isCurrent
                    ? 'bg-red-950/30 border-red-500 shadow-xl shadow-red-500/20 ring-1 ring-red-500/50'
                    : 'bg-card/70 border-white/10 hover:border-primary/50 hover:bg-card hover:scale-[1.02]'
                }`}
              >
                {/* Thumbnail with overlay */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                  <img
                    src={ep.thumbnailUrl || show.backdropUrl || show.posterUrl || fallbackPoster}
                    alt={ep.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackPoster;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <IconPlay className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {isCurrent ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white flex items-center gap-1 shadow-md animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        PLAYING NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-md">
                        EP {ep.episodeNumber}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/70 text-slate-300 flex items-center gap-1">
                      <IconClockCircle className="w-2.5 h-2.5" />
                      {ep.runtime || 45}m
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4
                      className={`text-sm font-bold line-clamp-1 transition-colors ${
                        isCurrent ? 'text-amber-300' : 'text-white group-hover:text-primary'
                      }`}
                    >
                      {ep.title && (ep.title.toLowerCase().startsWith('chapter') || ep.title.toLowerCase().startsWith('episode'))
                        ? ep.title
                        : `${ep.episodeNumber}. ${ep.title}`}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {ep.description || `Episode ${ep.episodeNumber} of ${show.title}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* More Series Like This Row */}
      {relatedShows.length > 0 && (
        <div className="pt-6 border-t border-white/10">
          <ContentRow
            title="More Series Like This"
            items={relatedShows}
            exploreHref="/tv"
          />
        </div>
      )}

      {/* Episode Drawer Modal */}
      {show.seasons && (
        <EpisodeDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          contentId={show.id}
          seasons={show.seasons}
          currentEpisodeId={currentEpisode.id}
        />
      )}

      {/* Share Dialog Modal */}
      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        content={show}
      />
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
