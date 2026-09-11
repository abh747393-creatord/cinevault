'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Play, Plus, Check, Share2, Star, Clock, Globe, Award, Clapperboard } from 'lucide-react';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentRow } from '@/components/rows/content-row';
import { ShareDialog } from '@/components/share/share-dialog';
import { formatDuration } from '@/lib/utils';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function MovieDetailsPage({ params }: { params: { slug: string } }) {
  const movie = SEED_CONTENT.find(
    (c) => c.slug === params.slug && c.contentType === 'movie'
  );

  const [inList, setInList] = useState(() => (movie ? isInWatchlist(movie.id) : false));
  const [showShareDialog, setShowShareDialog] = useState(false);

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
    (c) => c.id !== movie.id && c.genres.some((g) => movie.genres.some((mg) => mg.slug === g.slug))
  );

  return (
    <div className="min-h-screen pb-16 space-y-10">
      {/* Cinematic Backdrop Hero */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] min-h-[400px] overflow-hidden">
        <Image
          src={movie.backdropUrl}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
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
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 192px, 256px"
              priority
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
                <Star className="w-3 h-3 fill-amber-300" />
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
                  <Play className="w-5 h-5 fill-white" />
                  Watch Movie
                </Button>
              </Link>

              <Button
                variant={inList ? 'accent' : 'secondary'}
                size="lg"
                onClick={handleWatchlistToggle}
                className="flex items-center gap-2 px-5"
              >
                {inList ? (
                  <>
                    <Check className="w-5 h-5" />
                    In My List
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to List
                  </>
                )}
              </Button>

              <Button
                variant="glass"
                size="lg"
                onClick={() => setShowShareDialog(true)}
                className="flex items-center gap-2 px-5"
              >
                <Share2 className="w-5 h-5" />
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
