'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IconLayers,
  IconPlay,
  IconArrowLeft,
  IconClapperboardPlay,
  IconTV,
  IconRefresh,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/cards/content-card';
import { ContentItem } from '@/types/content';
import { getCollectionBySlug } from '@/lib/data/collections-data';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { getCollectionItems } from '@/lib/collections/collection-engine';

export default function CollectionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = getCollectionBySlug(params.slug);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

  // Load items for a given page
  const fetchPage = useCallback(
    async (targetPage: number, append = false) => {
      if (!collection) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        // 1. Try server-side collections API
        const res = await fetch(`/api/collections/${collection.slug}?page=${targetPage}`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const newItems: ContentItem[] = data.items || [];
          setItems((prev) => {
            if (!append) return newItems;
            const seen = new Set(prev.map((i) => i.id));
            const fresh = newItems.filter((i) => !seen.has(i.id));
            return [...prev, ...fresh];
          });
          setHasMore(Boolean(data.hasMore) && newItems.length > 0);
          setPage(targetPage);
          return;
        }

        // 2. Client-side fallback if server API is unavailable
        const tab = collection.providerTab || 'all';
        const tabData = await movieboxApi.homepage(tab, targetPage).catch(() => null);
        let rawCombined = tabData?.items || [];

        // If sparse, run search query fallback
        const searchQueries = collection.searchQueries || [];
        if (rawCombined.length < 10 && searchQueries.length > 0) {
          const targetQuery = searchQueries[(targetPage - 1) % searchQueries.length];
          if (targetQuery) {
            const searchData = await movieboxApi.search(targetQuery, 'moviebox', targetPage).catch(() => []);
            rawCombined = [...rawCombined, ...searchData];
          }
        }

        const filtered = getCollectionItems(collection, rawCombined, tabData?.metrics);
        setItems((prev) => {
          if (!append) return filtered;
          const seen = new Set(prev.map((i) => i.id));
          const fresh = filtered.filter((i) => !seen.has(i.id));
          return [...prev, ...fresh];
        });
        setHasMore(filtered.length >= 8);
        setPage(targetPage);
      } catch (err) {
        console.error('Failed to load collection items:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [collection]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

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
      {/* Collection Hero Header */}
      <div className="relative w-full min-h-[46vh] max-h-[520px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${collection.bannerUrl})`,
            filter: 'brightness(0.35)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-8 pt-14 z-10">
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

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" className="font-bold text-xs py-0.5 px-2.5">
                  <IconLayers className="w-3 h-3 mr-1" />
                  {collection.name}
                </Badge>

                {items.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-white border border-white/10">
                    {items.length} Titles Found
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {collection.name}
              </h1>

              <p className="text-xs sm:text-sm text-amber-400/90 font-medium italic">
                &quot;{collection.tagline}&quot;
              </p>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl line-clamp-3">
                {collection.description}
              </p>
            </div>

            {/* Quick Watch Button */}
            {firstPlayable && (
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                  href={
                    firstPlayable.contentType === 'tv'
                      ? `/watch/tv/${firstPlayable.id}/ep-1`
                      : `/watch/movie/${firstPlayable.id}`
                  }
                >
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center gap-2 font-bold px-6 shadow-xl shadow-primary/30"
                  >
                    <IconPlay className="w-4 h-4 fill-white" />
                    Play Featured
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Controls: Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Items ({items.length})
            </button>

            <button
              onClick={() => setFilterType('movie')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === 'movie'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <IconClapperboardPlay className="w-3.5 h-3.5 text-blue-400" />
              Movies ({items.filter((i) => i.contentType === 'movie').length})
            </button>

            <button
              onClick={() => setFilterType('tv')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === 'tv'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <IconTV className="w-3.5 h-3.5 text-emerald-400" />
              Series & TV ({items.filter((i) => i.contentType === 'tv').length})
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Dynamically filtered from real provider catalog
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/5"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <IconLayers className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No titles available right now</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t find any active titles matching this collection in the provider catalog. Check back soon.
            </p>
            <div className="pt-2">
              <Link href="/collections">
                <Button variant="secondary" size="sm">
                  Browse All Collections
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Content Cards Grid */}
        {!loading && filteredItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} content={item} />
              ))}
            </div>

            {/* Pagination / Load More */}
            {hasMore && (
              <div className="pt-8 text-center">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => fetchPage(page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-2 text-xs font-bold border border-white/10 hover:border-white/25"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <IconRefresh className="w-3.5 h-3.5 animate-spin" />
                      Loading More Titles...
                    </span>
                  ) : (
                    'Load More Titles'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
