import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, episodeId, positionSeconds, durationSeconds } = body;

    if (!contentId || positionSeconds === undefined || durationSeconds === undefined) {
      return NextResponse.json({ error: 'Missing required progress fields' }, { status: 400 });
    }

    const completed = durationSeconds > 0 && positionSeconds / durationSeconds >= 0.9;

    // If Supabase is connected, record to Postgres watch_history
    if (isSupabaseConfigured) {
      const supabase = getServerClient();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { toDeterministicUuid } = await import('@/lib/supabase/content-mapper');
          const dbContentId = toDeterministicUuid(contentId);

          // Ensure parent content record exists for foreign key constraint
          await supabase.from('content').upsert({
            id: dbContentId,
            external_id: contentId,
            content_type: episodeId ? 'tv' : 'movie',
            title: contentId,
            slug: contentId,
            poster_url: '',
            backdrop_url: '',
            release_date: new Date().toISOString(),
            year: new Date().getFullYear(),
            rating: 7.5,
            language: 'English',
            status: 'released',
          }, { onConflict: 'id', ignoreDuplicates: true });

          await supabase.from('watch_history').upsert({
            user_id: session.user.id,
            content_id: dbContentId,
            episode_id: episodeId || null,
            position_seconds: positionSeconds,
            duration_seconds: durationSeconds,
            completed,
            last_watched_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,content_id,episode_id',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      contentId,
      positionSeconds,
      completed,
    });
  } catch (error) {
    console.error('Error saving watch progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
