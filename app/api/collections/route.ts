import { NextResponse } from 'next/server';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { scoreItemForCollection, getCachedCollectionContent } from '@/lib/collections/collection-engine';

export const dynamic = 'force-dynamic';

interface CachedSummary {
  collections: any[];
  timestamp: number;
}

let cachedSummary: CachedSummary | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// High-yield seeds across all major collection categories to build a rich live catalog
const CATEGORY_DISCOVERY_QUERIES = [
  'Squid Game',
  'Hidden Love',
  'Demon Slayer',
  'Avengers',
  'Batman',
  'The Conjuring',
  'John Wick',
  'Interstellar',
  'Harry Potter',
  'Jawan',
  'Friends',
  'Breaking Bad',
  'Fast and Furious',
  'Star Wars',
  'The Godfather',
];

async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number = 3): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit).map((fn) => fn());
    const batchResults = await Promise.allSettled(batch);
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      }
    }
  }
  return results;
}

export async function GET() {
  const now = Date.now();
  if (cachedSummary && now - cachedSummary.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ collections: cachedSummary.collections });
  }

  try {
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

    // 1. Fetch base homepage feeds
    const [allFeed, movieFeed, tvFeed] = await Promise.allSettled([
      movieboxApi.homepage('all', 1),
      movieboxApi.homepage('movie', 1),
      movieboxApi.homepage('tv', 1),
    ]);

    if (allFeed.status === 'fulfilled' && allFeed.value?.items) {
      addItems(allFeed.value.items);
    }
    if (movieFeed.status === 'fulfilled' && movieFeed.value?.items) {
      addItems(movieFeed.value.items);
    }
    if (tvFeed.status === 'fulfilled' && tvFeed.value?.items) {
      addItems(tvFeed.value.items);
    }

    // 2. Fetch category search queries in parallel batches
    const searchTasks = CATEGORY_DISCOVERY_QUERIES.map((q) => () =>
      movieboxApi.search(q, 'moviebox', 1).catch(() => [])
    );
    const searchResults = await runWithLimit(searchTasks, 3);
    for (const items of searchResults) {
      addItems(items);
    }

    // 3. Score items for every collection definition
    const activeCollections = FRANCHISE_COLLECTIONS.map((col) => {
      // Check if we already have full discovery cached for this collection
      const cached = getCachedCollectionContent(col.slug);
      if (cached && cached.length > 0) {
        return {
          ...col,
          itemCount: cached.length,
        };
      }

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

    cachedSummary = {
      collections: activeCollections,
      timestamp: now,
    };

    return NextResponse.json({ collections: activeCollections });
  } catch (err) {
    console.error('[CollectionsAPI] Failed to aggregate collections:', err);
    return NextResponse.json({
      collections: FRANCHISE_COLLECTIONS.map((c) => ({ ...c, itemCount: 0 })),
    });
  }
}
