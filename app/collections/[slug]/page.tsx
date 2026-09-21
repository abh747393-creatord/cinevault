'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IconLayers,
  IconPlay,
  IconArrowLeft,
  IconShare,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/cards/content-card';
import { ContentItem } from '@/types/content';
import { getCollectionBySlug, FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { deduplicateAndCleanCatalog, getCanonicalTitle } from '@/lib/utils/content-filter';

export default function CollectionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = getCollectionBySlug(params.slug);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

  const mapToContentItem = (it: MovieBoxCatalogItem): ContentItem => {
    const rawId = it.id.value;
    const isSeries = it.media_type === 'series';
    const cleanTitle = getCanonicalTitle(it.title);
    const hasHindi = it.title.toLowerCase().includes('hindi');

    return {
      id: `mb-${rawId}`,
      externalId: rawId,
      title: cleanTitle || it.title,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl: it.poster_url || '/images/neutral-poster.svg',
      backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
      description: `${cleanTitle || it.title} (${it.year || ''}) - Official ${collection?.name || 'Franchise'} title.`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      status: 'released',
      language: hasHindi ? 'English / Hindi' : 'English / Multi',
      genres: [{ id: 'g-collection', name: collection?.name || 'Franchise', slug: 'franchise' }],
      availableAudio: hasHindi ? ['English (Original)', 'Hindi (Dub)'] : ['English (Original)'],
      availableSubtitles: ['English', 'Spanish', 'French'],
    };
  };

  useEffect(() => {
    if (!collection) return;

    let isMounted = true;
    async function resolveCollectionItems() {
      setLoading(true);
      try {
        const isAdultAllowed = collection!.slug.includes('american-pie');
        const queries =
          collection!.curatedTitles && collection!.curatedTitles.length > 0
            ? collection!.curatedTitles
            : collection!.searchQueries;

        const searchPromises = queries.map((q) =>
          movieboxApi.search(q).catch(() => [])
        );

        const resultsArrays = await Promise.all(searchPromises);
        if (!isMounted) return;

        const allRawItems = resultsArrays.flat();

        // Strictly clean, filter adult/mockbusters, and deduplicate
        const cleanedCatalog = deduplicateAndCleanCatalog(allRawItems, {
          allowAdultCollection: isAdultAllowed,
          curatedTitles: collection!.curatedTitles,
          requiredKeywords: collection!.requiredKeywords,
        });

        const combined = cleanedCatalog.map(mapToContentItem);

        // Sort by year descending (newest to classic)
        combined.sort((a, b) => (b.year || 0) - (a.year || 0));

        setItems(combined);
      } catch (err) {
        console.error('Failed to load collection items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    resolveCollectionItems();
    return () => {
      isMounted = false;
    };
  }, [collection]);

  if (!collection) {
    notFound();
  }

  const filteredItems = items.filter((it) => {
    if (filterType === 'all') return true;
    return it.contentType === filterType;
  });

  const firstPlayable = items[0];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 select-none">
      {/* Franchise Hero Header */}
      <div className="relative w-full min-h-[50vh] max-h-[540px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${collection.bannerUrl})`,
            filter: 'brightness(0.35)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-10 pt-16 z-10">
          {/* Breadcrumb & Back button */}
          <div className="mb-4">
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10"
            >
              <IconArrowLeft className="w-3.5 h-3.5" />
              All Collections
            </Link>
          </div>

          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" className="font-bold text-xs py-1 px-3">
                {collection.category.toUpperCase()} FRANCHISE
              </Badge>
              <Badge variant="rating" className="text-amber-400 border-amber-500/30 text-xs">
                ⭐ {collection.itemCount}+ Complete Titles
              </Badge>
              <Badge variant="quality" className="text-slate-300 text-xs">
                1080p Ultra HD Streams
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-xl">
              {collection.name}
            </h1>

            <p className="text-sm sm:text-base text-amber-300/90 font-medium italic">
              &quot;{collection.tagline}&quot;
            </p>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl drop-shadow">
              {collection.description}
            </p>

            {firstPlayable && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={
                    firstPlayable.contentType === 'movie'
                      ? `/watch/movie/${firstPlayable.id}`
                      : `/watch/tv/${firstPlayable.id}/s1e1`
                  }
                >
                  <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xl shadow-primary/30">
                    <IconPlay className="w-5 h-5 text-white" variant="Bold" />
                    Start Universe ({firstPlayable.title})
                  </Button>
                </Link>

                <Button
                  variant="glass"
                  size="lg"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Franchise link copied to clipboard!');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <IconShare className="w-4 h-4" />
                  Share Collection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <IconLayers className="w-5 h-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              All Titles in this Universe
            </h2>
            <span className="text-xs text-slate-400 font-medium ml-1">
              ({filteredItems.length} titles)
            </span>
          </div>

          {/* Sub-Filter: All / Movies / TV Series */}
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'movie'
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setFilterType('tv')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'tv'
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Series
            </button>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[35vh] flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Resolving {collection.name} archive...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <IconLayers className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No titles available for this filter</h3>
            <p className="text-xs text-slate-400">Switch filter to &quot;All&quot; to view all franchise titles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ContentCard key={item.id} content={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
