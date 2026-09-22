import { NextRequest, NextResponse } from 'next/server';
import { getCollectionBySlug } from '@/lib/data/collections-data';
import { movieboxApi, MovieBoxCatalogItem, BrowseMetrics } from '@/lib/api/moviebox-client';
import { getCollectionItems } from '@/lib/collections/collection-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const collection = getCollectionBySlug(params.slug);
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

  try {
    const rawItems: MovieBoxCatalogItem[] = [];
    const metrics: Record<string, BrowseMetrics> = {};
    const seenIds = new Set<string>();

    const addItems = (items?: MovieBoxCatalogItem[], itemMetrics?: Record<string, BrowseMetrics>) => {
      if (!items) return;
      for (const it of items) {
        if (it?.id?.value && !seenIds.has(it.id.value)) {
          seenIds.add(it.id.value);
          rawItems.push(it);
        }
      }
      if (itemMetrics) {
        Object.assign(metrics, itemMetrics);
      }
    };

    // 1. Fetch primary provider tab feed for the collection
    const targetTab = collection.providerTab || 'all';
    try {
      const tabData = await movieboxApi.homepage(targetTab, page);
      addItems(tabData?.items, tabData?.metrics);
    } catch (tabErr) {
      console.warn(`[CollectionSlugAPI] Primary tab '${targetTab}' fetch error:`, tabErr);
    }

    // 2. Targeted search queries fallback if items are sparse
    const searchQueries = collection.searchQueries || [];
    if (searchQueries.length > 0) {
      // Pick query for this page (page 1 uses query 0, page 2 uses query 1 if available, etc.)
      const queryIdx = (page - 1) % searchQueries.length;
      const targetQuery = searchQueries[queryIdx];
      if (targetQuery) {
        try {
          const searchResults = await movieboxApi.search(targetQuery, 'moviebox', page);
          addItems(searchResults);
        } catch (searchErr) {
          console.warn(`[CollectionSlugAPI] Search '${targetQuery}' failed:`, searchErr);
        }
      }
    }

    // 3. Score, filter, deduplicate, and convert to real ContentItems
    const matchedItems = getCollectionItems(collection, rawItems, metrics);

    return NextResponse.json({
      collection,
      items: matchedItems,
      page,
      hasMore: matchedItems.length >= 8,
    });
  } catch (err) {
    console.error(`[CollectionSlugAPI] Error resolving collection '${params.slug}':`, err);
    return NextResponse.json(
      { error: 'Failed to resolve collection items' },
      { status: 500 }
    );
  }
}
