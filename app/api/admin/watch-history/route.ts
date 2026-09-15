import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';

export const dynamic = 'force-dynamic';

const DEMO_ACTIVITY = [
  {
    id: 'act-1',
    userId: 'demo-user-1',
    userEmail: 'marcus.vance@example.com',
    userName: 'Marcus Vance',
    contentId: 'movie-1',
    contentTitle: 'Inception',
    contentType: 'movie',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    progressSeconds: 4320,
    durationSeconds: 8880,
    completed: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    device: 'Chrome / Windows',
  },
  {
    id: 'act-2',
    userId: 'demo-user-2',
    userEmail: 'elena.rostova@example.com',
    userName: 'Elena Rostova',
    contentId: 'tv-1',
    contentTitle: 'Stranger Things',
    contentType: 'tv',
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    progressSeconds: 3100,
    durationSeconds: 3100,
    completed: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    device: 'Safari / MacOS',
  },
  {
    id: 'act-3',
    userId: 'demo-user-3',
    userEmail: 'kenji.sato@example.com',
    userName: 'Kenji Sato',
    contentId: 'anime-1',
    contentTitle: 'Attack on Titan',
    contentType: 'anime',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    progressSeconds: 1200,
    durationSeconds: 1440,
    completed: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    device: 'Firefox / Linux',
  },
  {
    id: 'act-4',
    userId: 'demo-admin-123',
    userEmail: 'admin@cinevault.local',
    userName: 'Super Admin',
    contentId: 'movie-2',
    contentTitle: 'The Dark Knight',
    contentType: 'movie',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    progressSeconds: 9120,
    durationSeconds: 9120,
    completed: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    device: 'Edge / Windows',
  },
];

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
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const supabase = getAdminClient() || getServerClient();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, count, error } = await supabase
        .from('watch_history')
        .select(
          'id, user_id, content_id, progress_seconds, completed, updated_at, profiles(username, display_name, email), content(title, content_type, poster_url, runtime)',
          { count: 'exact' }
        )
        .order('updated_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (!error && data && data.length > 0) {
        const total = count ?? data.length;
        const mapped = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          userEmail: item.profiles?.email || `${item.profiles?.username || 'user'}@cinevault.local`,
          userName: item.profiles?.display_name || item.profiles?.username || 'User',
          contentId: item.content_id,
          contentTitle: item.content?.title || 'Unknown Title',
          contentType: item.content?.content_type || 'movie',
          posterUrl: item.content?.poster_url || '',
          progressSeconds: item.progress_seconds || 0,
          durationSeconds: (item.content?.runtime || 90) * 60,
          completed: item.completed || false,
          updatedAt: item.updated_at,
          device: 'Web Client',
        }));

        return NextResponse.json({
          activity: mapped,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    } catch (err) {
      console.error('Watch history API error:', err);
    }
  }

  // Fallback demo activity
  let filtered = [...DEMO_ACTIVITY];
  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.userName.toLowerCase().includes(search) ||
        a.userEmail.toLowerCase().includes(search) ||
        a.contentTitle.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    activity: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
