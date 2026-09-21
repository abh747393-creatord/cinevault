import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { ContentItem } from '@/types/content';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Track runtime creations and deletions across requests
const runtimeCustomItems: ContentItem[] = [];
const deletedItemIds = new Set<string>();

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10), 1), 100);
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const contentType = searchParams.get('type') || 'all';

  // 1. Fetch items from Supabase database
  let dbItems: ContentItem[] = [];
  const supabase = getAdminClient() || getServerClient();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        dbItems = data.map((row) => ({
          id: row.id,
          title: row.title,
          contentType: row.content_type || 'movie',
          slug: row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          posterUrl: row.poster_url || '/images/neutral-poster.svg',
          backdropUrl: row.backdrop_url || '/images/neutral-backdrop.svg',
          description: row.description || '',
          year: row.year || (row.release_date ? new Date(row.release_date).getFullYear() : 2024),
          rating: row.rating ? parseFloat(row.rating) : undefined,
          quality: row.quality || undefined,
          releaseDate: row.release_date || (row.year ? `${row.year}-01-01` : ''),
          language: row.language || 'English',
          status: (row.status as any) || 'released',
          genres: [],
        }));
      }
    } catch (e) {
      console.error('Database query error in admin content API:', e);
    }
  }

  // 2. Fetch provider items from upstream MovieBox gateway
  let providerItems: ContentItem[] = [];
  try {
    const feed = await movieboxApi.homepage('all', 1);
    if (feed?.items) {
      providerItems = feed.items.map((it) => ({
        id: `mb-${it.id.value}`,
        externalId: it.id.value,
        title: it.title,
        contentType: it.media_type === 'series' ? 'tv' : 'movie',
        slug: `mb-${it.id.value}`,
        posterUrl: it.poster_url || '/images/neutral-poster.svg',
        backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
        description: `${it.title} - CineVault Stream`,
        year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
        rating: undefined,
        releaseDate: it.year ? `${it.year}-01-01` : '',
        language: 'English',
        status: 'released',
        genres: [],
      }));
    }
  } catch (e) {
    // ignore upstream fetch failures gracefully
  }

  // 3. Merge: DB items, runtime additions, and providerItems (ensuring no duplicates)
  const merged: ContentItem[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  const addItemIfUnique = (item: ContentItem) => {
    if (deletedItemIds.has(item.id) || (item.slug && deletedItemIds.has(item.slug))) {
      return;
    }
    const normSlug = (item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();
    if (seenIds.has(item.id) || seenSlugs.has(normSlug)) {
      return;
    }
    seenIds.add(item.id);
    seenSlugs.add(normSlug);
    merged.push(item);
  };

  // Add custom items created during this runtime first
  for (const item of runtimeCustomItems) {
    addItemIfUnique(item);
  }

  // Add DB items
  for (const item of dbItems) {
    addItemIfUnique(item);
  }

  // Add provider items
  for (const item of providerItems) {
    addItemIfUnique(item);
  }

  // 4. Apply Filters
  let filtered = merged;

  if (contentType !== 'all') {
    filtered = filtered.filter((c) => c.contentType === contentType);
  }

  if (search) {
    filtered = filtered.filter((c) => {
      const titleMatch = c.title.toLowerCase().includes(search);
      const slugMatch = c.slug?.toLowerCase().includes(search);
      const descMatch = c.description?.toLowerCase().includes(search);
      return titleMatch || slugMatch || descMatch;
    });
  }

  // 5. Pagination
  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    items: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, contentType, description, year, rating, posterUrl, backdropUrl } = body;

    if (!title || !contentType) {
      return NextResponse.json({ error: 'Title and contentType are required' }, { status: 400 });
    }

    const newId = crypto.randomUUID();
    const newItem: ContentItem = {
      id: newId,
      title: title.trim(),
      contentType,
      slug: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || 'Synopsis pending.',
      year: year || new Date().getFullYear(),
      rating: rating ? Number(rating) : undefined,
      posterUrl: posterUrl || '/images/neutral-poster.svg',
      backdropUrl: backdropUrl || '/images/neutral-backdrop.svg',
      releaseDate: `${year || new Date().getFullYear()}-01-01`,
      language: 'English',
      status: 'released',
      genres: [],
    };

    // Store in runtime cache
    runtimeCustomItems.unshift(newItem);

    // Attempt DB sync
    const supabase = getAdminClient() || getServerClient();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('content')
          .insert({
            id: newItem.id,
            title: newItem.title,
            slug: newItem.slug,
            content_type: newItem.contentType,
            description: newItem.description,
            rating: newItem.rating,
            year: newItem.year,
            poster_url: newItem.posterUrl,
            backdrop_url: newItem.backdropUrl,
          });
      } catch (dbErr) {
        console.warn('Could not persist content to Supabase:', dbErr);
      }
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create content' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Content id is required' }, { status: 400 });
  }

  // Mark as deleted
  deletedItemIds.add(id);

  // Remove from runtime items if present
  const runtimeIdx = runtimeCustomItems.findIndex((item) => item.id === id);
  if (runtimeIdx !== -1) {
    runtimeCustomItems.splice(runtimeIdx, 1);
  }

  // Delete from Supabase if present
  const supabase = getAdminClient() || getServerClient();
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('content').delete().eq('id', id);
    } catch (e) {
      console.warn('Could not delete from Supabase:', e);
    }
  }

  return NextResponse.json({ success: true, id });
}
