'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  IconPlay,
  IconPlus,
  IconCheck,
  IconShare,
  IconStar,
  IconClapperboardPlay,
} from '@/components/ui/icons';
import { providerResolver } from '@/lib/providers/resolver';
import { ContentItem } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShareDialog } from '@/components/share/share-dialog';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function MovieDetailsPage({ params }: { params: { slug: string } }) {
  const [movie, setMovie] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    providerResolver.resolveMovie(params.slug).then((resolved) => {
      if (isMounted) {
        setMovie(resolved);
        if (resolved) setInList(isInWatchlist(resolved.id));
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading movie details...</p>
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

  const fallbackBackdrop = '/images/neutral-backdrop.svg';
  const fallbackPoster = '/images/neutral-poster.svg';

  return (
    <div className="min-h-screen pb-16 space-y-10">
      {/* Cinematic Backdrop Hero */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] min-h-[400px] overflow-hidden">
        <Image
          src={movie.backdropUrl || fallbackBackdrop}
          alt={movie.title}
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

      {/* Main Content Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-32 sm:-mt-44 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Box */}
          <div className="w-48 sm:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-card mx-auto md:mx-0 aspect-[2/3] relative">
            <Image
              src={movie.posterUrl || fallbackPoster}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 192px, 256px"
              priority
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackPoster;
              }}
              className="object-cover"
            />
          </div>

          {/* Details & Information */}
          <div className="flex-1 space-y-5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant="primary" size="sm">Movie</Badge>
              {movie.rating !== undefined && movie.rating > 0 && (
                <Badge variant="rating" size="sm" className="flex items-center gap-1">
                  <IconStar className="w-3 h-3 text-amber-300" variant="Bold" />
                  {movie.rating.toFixed(1)}
                </Badge>
              )}
              {movie.quality && <Badge variant="quality" size="sm">{movie.quality}</Badge>}
              <span className="text-xs text-slate-400 font-medium">
                {movie.year}
                {movie.runtime ? ` • ${formatDuration(movie.runtime)}` : ''}
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {movie.title}
              </h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-sm text-slate-400 mt-1 italic">
                  {movie.originalTitle}
                </p>
              )}
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {movie.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link href={`/watch/movie/${movie.id}`}>
                <Button variant="primary" size="lg" className="flex items-center gap-2 px-6 shadow-xl shadow-primary/30">
                  <IconPlay className="w-5 h-5" variant="Bold" />
                  Stream Movie
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
                aria-label="Share movie"
              >
                <IconShare className="w-5 h-5" />
                Share
              </Button>
            </div>

            {/* Production & Cast Metadata */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {movie.director && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-1">Director</span>
                  <span className="text-slate-200 font-medium">{movie.director}</span>
                </div>
              )}

              {movie.cast && movie.cast.length > 0 && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-1">Cast</span>
                  <span className="text-slate-200">{movie.cast.join(', ')}</span>
                </div>
              )}

              <div>
                <span className="text-slate-500 block font-semibold mb-1">Audio & Subtitles</span>
                <span className="text-slate-200">
                  {movie.language} ({movie.availableAudio?.join(', ') || 'Original'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        content={movie}
      />
    </div>
  );
}
