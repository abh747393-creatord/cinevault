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
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { providerResolver } from '@/lib/providers/resolver';
import { ContentItem } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentRow } from '@/components/rows/content-row';
import { ShareDialog } from '@/components/share/share-dialog';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function MovieDetailsPage({ params }: { params: { slug: string } }) {
  const [movie, setMovie] = useState<ContentItem | null>(() => {
    return (
      SEED_CONTENT.find(
        (c) => (c.slug === params.slug || c.id === params.slug) && c.contentType === 'movie'
      ) || null
    );
  });
  const [loading, setLoading] = useState(!movie);
  const [inList, setInList] = useState(() => (movie ? isInWatchlist(movie.id) : false));
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!movie) {
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
    }
    return () => {
      isMounted = false;
    };
  }, [params.slug, movie]);

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

  const relatedMovies = SEED_CONTENT.filter(
    (c) => c.id !== movie.id && c.genres.some((g) => movie.genres?.some((mg) => mg.slug === g.slug))
  );

  const fallbackBackdrop = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80';
  const fallbackPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';

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

          {/* Details Info */}
          <div className="flex-1 space-y-5 text-center md:text-left">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant="primary" size="sm">
                Movie
              </Badge>
              <Badge variant="rating" size="sm" className="flex items-center gap-1">
                <IconStar className="w-3 h-3 text-amber-300" variant="Bold" />
                {movie.rating}
              </Badge>
              {movie.quality && <Badge variant="quality" size="sm">{movie.quality}</Badge>}
              {movie.ageRating && <Badge variant="outline" size="sm">{movie.ageRating}</Badge>}
              <span className="text-xs text-slate-400 font-medium">
                {movie.year} • {formatDuration(movie.runtime)}
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {movie.title}
              </h1>
              {movie.originalTitle && (
                <p className="text-sm text-slate-400 italic mt-1">{movie.originalTitle}</p>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              {movie.genres.map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 rounded-full bg-white/10 text-xs text-slate-200 border border-white/5"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {movie.description}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link href={`/watch/movie/${movie.id}`}>
                <Button variant="primary" size="lg" className="flex items-center gap-2 px-8">
                  <IconPlay className="w-5 h-5 text-white" variant="Bold" />
                  Watch Movie
                </Button>
              </Link>

              {movie.youtubeId && (
                <Link href={`/watch/movie/${movie.id}`}>
                  <Button variant="glass" size="lg" className="flex items-center gap-2 px-5 text-accent hover:text-white border-accent/40 shadow-sm">
                    <IconClapperboardPlay className="w-5 h-5" />
                    Watch Trailer
                  </Button>
                </Link>
              )}

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

              {movie.externalId && movie.externalId.startsWith('imdb-') && (
                <a
                  href={`https://www.imdb.com/title/${movie.externalId.replace('imdb-', '')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="glass"
                    size="lg"
                    className="flex items-center gap-2 px-5 text-amber-300 hover:text-amber-200 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <span className="font-black bg-amber-400 text-black px-1.5 py-0.5 rounded text-[10px] tracking-tighter">IMDb</span>
                    View on IMDb
                  </Button>
                </a>
              )}
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

      {/* Recommended / Related Movies */}
      <div className="pt-8">
        <ContentRow
          title="More Like This"
          items={relatedMovies}
        />
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
