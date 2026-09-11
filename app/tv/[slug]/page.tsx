'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Play, Plus, Check, Share2, Star, Tv, Sparkles } from 'lucide-react';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentRow } from '@/components/rows/content-row';
import { EpisodeCard } from '@/components/cards/episode-card';
import { ShareDialog } from '@/components/share/share-dialog';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage/local-storage-store';

export default function TvDetailsPage({ params }: { params: { slug: string } }) {
  const show = SEED_CONTENT.find(
    (c) => c.slug === params.slug && (c.contentType === 'tv' || c.contentType === 'anime')
  );

  const [inList, setInList] = useState(() => (show ? isInWatchlist(show.id) : false));
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [showShareDialog, setShowShareDialog] = useState(false);

  if (!show) {
    notFound();
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

  const relatedShows = SEED_CONTENT.filter(
    (c) => c.id !== show.id && (c.contentType === 'tv' || c.contentType === 'anime')
  );

  return (
    <div className="min-h-screen pb-16 space-y-10">
      {/* Backdrop Header */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] min-h-[400px] overflow-hidden">
        <Image
          src={show.backdropUrl}
          alt={show.title}
          fill
          priority
          sizes="100vw"
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
              src={show.posterUrl}
              alt={show.title}
              fill
              sizes="(max-width: 768px) 192px, 256px"
              priority
              className="object-cover"
            />
          </div>

          <div className="flex-1 space-y-5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant={show.contentType === 'anime' ? 'accent' : 'primary'} size="sm">
                {show.contentType === 'anime' ? 'Anime Series' : 'TV Series'}
              </Badge>
              <Badge variant="rating" size="sm" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300" />
                {show.rating}
              </Badge>
              {show.quality && <Badge variant="quality" size="sm">{show.quality}</Badge>}
              <span className="text-xs text-slate-400 font-medium">
                {show.year} • {seasons.length} Season{seasons.length > 1 ? 's' : ''}
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

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {show.description}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link href={`/watch/tv/${show.id}/${firstEpisodeId}`}>
                <Button variant="primary" size="lg" className="flex items-center gap-2 px-8">
                  <Play className="w-5 h-5 fill-white" />
                  Start Watching E1
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
      <div className="pt-8">
        <ContentRow
          title="Similar Series & Shows"
          items={relatedShows}
        />
      </div>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        content={show}
      />
    </div>
  );
}
