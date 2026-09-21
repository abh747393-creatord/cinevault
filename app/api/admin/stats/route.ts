import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getServerClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';
import { providerResolver } from '@/lib/providers/resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    let totalUsers = 1; // At least the administrator
    let activeUsers = 1;
    let totalContent = 0;
    let moviesCount = 0;
    let tvCount = 0;
    let animeCount = 0;
    let totalWatchSessions = 0;
    let totalWatchMinutes = 0;
    let recentSessions: any[] = [];

    const supabase = getAdminClient() || getServerClient();

    if (isSupabaseConfigured && supabase) {
      // 1. Total & Active Users
      const { count: uCount, error: uErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (!uErr && typeof uCount === 'number') {
        totalUsers = Math.max(uCount, 1);
        activeUsers = Math.max(uCount, 1);
      }

      // 2. Content counts from database if populated
      const { count: cCount, error: cErr } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true });
      if (!cErr && typeof cCount === 'number' && cCount > 0) {
        totalContent = cCount;
        const { count: mCount } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('content_type', 'movie');
        if (typeof mCount === 'number') moviesCount = mCount;

        const { count: tCount } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('content_type', 'tv');
        if (typeof tCount === 'number') tvCount = tCount;

        const { count: aCount } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('content_type', 'anime');
        if (typeof aCount === 'number') animeCount = aCount;
      }

      // 3. Watch history telemetry
      const { data: historyData, error: hErr } = await supabase
        .from('watch_history')
        .select('id, user_id, content_id, progress_seconds, completed, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!hErr && historyData && historyData.length > 0) {
        totalWatchSessions = historyData.length;
        const sumSec = historyData.reduce((acc, h) => acc + (h.progress_seconds || 0), 0);
        totalWatchMinutes = Math.round(sumSec / 60);
        recentSessions = historyData;
      }
    }

    const providers = providerResolver.getProvidersMetadata();

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        content: {
          total: totalContent,
          movies: moviesCount,
          tv: tvCount,
          anime: animeCount,
          franchises: FRANCHISE_COLLECTIONS.length,
        },
        playback: {
          totalSessions: totalWatchSessions,
          totalWatchMinutes,
          totalWatchHours: (totalWatchMinutes / 60).toFixed(1),
        },
        providers: {
          total: providers.length,
          active: providers.filter((p) => p.enabled).length,
        },
      },
      recentSessions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to compute admin statistics' },
      { status: 500 }
    );
  }
}
