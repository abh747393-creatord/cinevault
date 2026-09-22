import { NextResponse } from 'next/server';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { scoreItemForCollection } from '@/lib/collections/collection-engine';

export const dynamic = 'force-dynamic';

interface CachedSummary {
  collections: any[];
  timestamp: number;
}

let cachedSummary: CachedSummary | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();
  if (cachedSummary && now - cachedSummary.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ collections: cachedSummary.collections });
  }

  try {
    // 1. Fetch base homepage feeds to discover real live catalog
    const [allFeed, movieFeed, tvFeed] = await Promise.allSettled([
      movieboxApi.homepage('all', 1),
      movieboxApi.homepage('movie', 1),
      movieboxApi.homepage('tv', 1),
    ]);

    const rawItems: MovieBoxCatalogItem[] = [];
    const seenIds = new Set<string>();

    const addItems = (items?: MovieBoxCatalogItem[]) => {
      if (!items) return;
      for (const it of items) {
        if (it?.id?.value && !seenIds.has(it.id.value)) {
          seenIds.add(it.id.value);
          rawItems.push(it);
        }
      }
    };

    if (allFeed.status === 'fulfilled' && allFeed.value?.items) {
      addItems(allFeed.value.items);
    }
    if (movieFeed.status === 'fulfilled' && movieFeed.value?.items) {
      addItems(movieFeed.value.items);
    }
    if (tvFeed.status === 'fulfilled' && tvFeed.value?.items) {
      addItems(tvFeed.value.items);
    }

    // 2. Score items for every collection definition
    const activeCollections = FRANCHISE_COLLECTIONS.map((col) => {
      let matchCount = 0;
      for (const it of rawItems) {
        if (scoreItemForCollection(it, col) >= 5) {
          matchCount++;
        }
      }
      return {
        ...col,
        itemCount: matchCount,
      };
    });

    // 3. Minimum Content Rule: Filter out collections that currently have 0 items
    // (Note: If feed is temporarily empty e.g. upstream cold start, provide known active collections with placeholder count 0 so UI renders gracefully without crashing)
    const validCollections = activeCollections.filter((c) => (c.itemCount || 0) > 0);
    const resultCollections = validCollections.length > 0 ? validCollections : activeCollections;

    cachedSummary = {
      collections: resultCollections,
      timestamp: now,
    };

    return NextResponse.json({ collections: resultCollections });
  } catch (err) {
    console.error('[CollectionsAPI] Failed to aggregate collections:', err);
    // Graceful fallback with zero-count definitions (never dummy content)
    return NextResponse.json({
      collections: FRANCHISE_COLLECTIONS.map((c) => ({ ...c, itemCount: 0 })),
    });
  }
}
