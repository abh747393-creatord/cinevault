import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { SEED_GENRES, SEED_CONTENT } from '@/lib/data/catalog-seed';

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

  // Generate date points based on range
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const timeSeriesData = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // Simulated realistic curve centered around active baseline
    const baseVal = 320 + Math.floor(Math.sin(i * 0.7) * 90) + (i % 3) * 25;
    timeSeriesData.push({
      label,
      value: baseVal,
      secondaryValue: Math.floor(baseVal * 0.7),
    });
  }

  // Genre breakdown
  const genreBreakdown = [
    { label: 'Action & Sci-Fi', value: 482 },
    { label: 'Animation & Anime', value: 395 },
    { label: 'Drama & Crime', value: 310 },
    { label: 'Thriller & Mystery', value: 240 },
    { label: 'Adventure', value: 195 },
  ];

  // Content type breakdown
  const contentTypeBreakdown = [
    { label: 'Movies', value: SEED_CONTENT.filter((c) => c.contentType === 'movie').length },
    { label: 'TV Shows', value: SEED_CONTENT.filter((c) => c.contentType === 'tv').length },
    { label: 'Anime', value: SEED_CONTENT.filter((c) => c.contentType === 'anime').length },
  ];

  // Streaming quality distribution
  const qualityDistribution = [
    { label: '1080p Full HD', value: 62 },
    { label: '4K Ultra HD', value: 28 },
    { label: '720p HD', value: 10 },
  ];

  return NextResponse.json({
    range,
    timeSeries: timeSeriesData,
    genres: genreBreakdown,
    contentTypes: contentTypeBreakdown,
    qualities: qualityDistribution,
    summary: {
      totalStreams: timeSeriesData.reduce((acc, cur) => acc + cur.value, 0),
      avgCompletionRate: '78.4%',
      avgWatchDurationMinutes: 46,
      topProvider: 'MovieBox Daemon (Rust Engine)',
    },
  });
}
