import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getServerClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { SEED_CONTENT, SEED_GENRES } from '@/lib/data/catalog-seed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';

  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const now = new Date();

  // Initialize date buckets
  const timeSeriesMap = new Map<string, { label: string; value: number; secondaryValue: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timeSeriesMap.set(key, { label, value: 0, secondaryValue: 0 });
  }

  let totalStreams = 0;
  let totalMinutes = 0;
  let completedCount = 0;

  const supabase = getAdminClient() || getServerClient();
  if (isSupabaseConfigured && supabase) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const { data: history } = await supabase
        .from('watch_history')
        .select('progress_seconds, completed, updated_at')
        .gte('updated_at', sinceDate.toISOString());

      if (history && history.length > 0) {
        totalStreams = history.length;
        for (const h of history) {
          const dayKey = h.updated_at ? h.updated_at.slice(0, 10) : '';
          if (timeSeriesMap.has(dayKey)) {
            const entry = timeSeriesMap.get(dayKey)!;
            entry.value += 1;
            if (h.completed) {
              entry.secondaryValue += 1;
              completedCount++;
            }
          }
          totalMinutes += Math.round((h.progress_seconds || 0) / 60);
        }
      }
    } catch (e) {
      console.error('[Analytics] Query error:', e);
    }
  }

  const timeSeriesData = Array.from(timeSeriesMap.values());

  // Genre breakdown from real catalog content
  const genreCounts: Record<string, number> = {};
  for (const item of SEED_CONTENT) {
    for (const g of item.genres || []) {
      genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
    }
  }

  const genreBreakdown = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // Content type breakdown
  const contentTypeBreakdown = [
    { label: 'Movies', value: SEED_CONTENT.filter((c) => c.contentType === 'movie').length },
    { label: 'TV Shows', value: SEED_CONTENT.filter((c) => c.contentType === 'tv').length },
    { label: 'Anime', value: SEED_CONTENT.filter((c) => c.contentType === 'anime').length },
  ];

  // Quality distribution based on real catalog content
  const qualityCounts: Record<string, number> = { '4K Ultra HD': 0, '1080p Full HD': 0, '720p HD': 0 };
  for (const item of SEED_CONTENT) {
    const q = item.quality || '1080p';
    if (q.includes('4K') || q.includes('2160')) qualityCounts['4K Ultra HD']++;
    else if (q.includes('720')) qualityCounts['720p HD']++;
    else qualityCounts['1080p Full HD']++;
  }

  const qualityDistribution = Object.entries(qualityCounts).map(([label, value]) => ({ label, value }));

  const avgCompletionRate = totalStreams > 0
    ? `${Math.round((completedCount / totalStreams) * 100)}%`
    : '0%';
  const avgWatchDurationMinutes = totalStreams > 0
    ? Math.round(totalMinutes / totalStreams)
    : 0;

  return NextResponse.json({
    range,
    timeSeries: timeSeriesData,
    genres: genreBreakdown,
    contentTypes: contentTypeBreakdown,
    qualities: qualityDistribution,
    summary: {
      totalStreams,
      avgCompletionRate,
      avgWatchDurationMinutes,
      topProvider: 'Sign Ultra VIP Cinema',
    },
  });
}
