'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  IconPlay,
  IconPlus,
  IconCheck,
  IconShare,
  IconStar,
  IconAlertCircle,
} from '@/components/ui/icons';
import { providerResolver } from '@/lib/providers/resolver';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { ContentItem } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentRow } from '@/components/rows/content-row';
import { EpisodeCard } from '@/components/cards/episode-card';
import { ShareDialog } from '@/components/share/share-dialog';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function TvDetailsPage({ params }: { params: { slug: string } }) {
  const [show, setShow] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inList, setInList] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [relatedShows, setRelatedShows] = useState<ContentItem[]>([]);

  const loadTvShow = useCallback(async () => {
    setLoading(true);
    setError(null);

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 8000)
    );

    try {
      const resolved = await Promise.race([
        providerResolver.resolveTvShow(params.slug),
        timeoutPromise,
      ]);

      if (resolved) {
        setShow(resolved);
        setInList(isInWatchlist(resolved.id));
        setError(null);

        // Fetch real related TV shows
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
        setError('TV show details unavailable.');
      }
    } catch (err: any) {
      console.warn('[TvDetailsPage] Failed to resolve TV show:', err);
      if (err?.message === 'Request timed out') {
        setError('Unable to load TV show. Request timed out.');
      } else {
        setError('Unable to load TV show. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    loadTvShow();
  }, [loadTvShow]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading TV show details...</p>
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

  const handleWatchlistToggle = () => {
    if (inList) {
      removeFromWatchlist(show.id);
      setInList(false);
    } else {
      addToWatchlist(show);
      setInList(true);
    }
  };

  const seasons = show.seasons || [];
  const currentSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  const firstEpisodeId = currentSeason?.episodes?.[0]?.id || 'ep-1';

  const fallbackBackdrop = '/images/neutral-backdrop.svg';
  const fallbackPoster = '/images/neutral-poster.svg';

  return (
    <div className="min-h-screen pb-16 space-y-10">
      {/* Backdrop Header */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] min-h-[400px] overflow-hidden">
        <Image
          src={show.backdropUrl || fallbackBackdrop}
          alt={show.title}
          fill
          priority
          sizes="100vw"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackBackdrop;
          }}
          className="object-cover object-center filter brightness-[0.7]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      {/* Main Metadata */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-32 sm:-mt-44 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-48 sm:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-card mx-auto md:mx-0 aspect-[2/3] relative">
            <Image
              src={show.posterUrl || fallbackPoster}
              alt={show.title}
              fill
              sizes="(max-width: 768px) 192px, 256px"
              priority
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackPoster;
              }}
              className="object-cover"
            />
          </div>

          <div className="flex-1 space-y-5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant={show.contentType === 'anime' ? 'accent' : 'primary'} size="sm">
                {show.contentType === 'anime' ? 'Anime Series' : 'TV Series'}
              </Badge>
              {show.rating !== undefined && show.rating > 0 && (
                <Badge variant="rating" size="sm" className="flex items-center gap-1">
                  <IconStar className="w-3 h-3 text-amber-300" variant="Bold" />
                  {show.rating.toFixed(1)}
                </Badge>
              )}
              {show.quality && <Badge variant="quality" size="sm">{show.quality}</Badge>}
              <span className="text-xs text-slate-400 font-medium">
                {show.year ? `${show.year} • ` : ''}{seasons.length} Season{seasons.length > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {show.title}
              </h1>
              {show.originalTitle && (
                <p className="text-sm text-slate-400 italic mt-1">{show.originalTitle}</p>
              )}
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {show.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full bg-white/10 text-xs text-slate-200 border border-white/5"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {show.description}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link href={`/watch/tv/${show.id}/${firstEpisodeId}`}>
                <Button variant="primary" size="lg" className="flex items-center gap-2 px-8">
                  <IconPlay className="w-5 h-5 text-white" variant="Bold" />
                  Start Watching E1
                </Button>
              </Link>

              <Button
                variant={inList ? 'accent' : 'secondary'}
                size="lg"
                onClick={handleWatchlistToggle}
                className="flex items-center gap-2 px-5"
                aria-label={inList ? 'In My List' : 'Add to List'}
              >
                {inList ? (
                  <>
                    <IconCheck className="w-5 h-5" />
                    In My List
                  </>
                ) : (
                  <>
                    <IconPlus className="w-5 h-5" />
                    Add to List
                  </>
                )}
              </Button>

              <Button
                variant="glass"
                size="lg"
                onClick={() => setShowShareDialog(true)}
                className="flex items-center gap-2 px-5"
                aria-label="Share TV show"
              >
                <IconShare className="w-5 h-5" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Seasons & Episodes Area */}
        <div className="mt-14 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Episodes ({currentSeason?.episodes?.length || 0})
            </h2>

            {/* Season Selector Tabs */}
            {seasons.length > 1 && (
              <div className="flex items-center gap-2">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSeasonNumber === s.seasonNumber
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Season {s.seasonNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode List */}
          <div className="space-y-3">
            {currentSeason?.episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                contentId={show.id}
                episode={ep}
              />
            ))}
          </div>
        </div>
      </div>

      {/* More Like This */}
      {relatedShows.length > 0 && (
        <div className="pt-8">
          <ContentRow
            title="Similar Series & Shows"
            items={relatedShows}
          />
        </div>
      )}

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        content={show}
      />
    </div>
  );
}
