import { NextRequest, NextResponse } from 'next/server';
import { getCollectionBySlug } from '@/lib/data/collections-data';
import { discoverCollectionContent } from '@/lib/collections/collection-engine';

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
  const PAGE_SIZE = 24;

  try {
    const allDiscoveredItems = await discoverCollectionContent(collection);

    const startIndex = (page - 1) * PAGE_SIZE;
    const pagedItems = allDiscoveredItems.slice(startIndex, startIndex + PAGE_SIZE);

    return NextResponse.json({
      collection,
      items: pagedItems,
      page,
      total: allDiscoveredItems.length,
      hasMore: allDiscoveredItems.length > startIndex + PAGE_SIZE,
    });
  } catch (err) {
    console.error(`[CollectionSlugAPI] Error resolving collection '${params.slug}':`, err);
    return NextResponse.json(
      { error: 'Failed to resolve collection items' },
      { status: 500 }
    );
  }
}
