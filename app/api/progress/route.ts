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
          await supabase.from('watch_history').upsert({
            user_id: session.user.id,
            content_id: contentId,
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
