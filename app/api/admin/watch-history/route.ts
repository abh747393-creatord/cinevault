import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

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
        let mapped = data.map((item: any) => ({
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

        if (search) {
          mapped = mapped.filter(
            (a: any) =>
              a.userName.toLowerCase().includes(search) ||
              a.userEmail.toLowerCase().includes(search) ||
              a.contentTitle.toLowerCase().includes(search)
          );
        }

        const total = count ?? mapped.length;

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

  // Clean empty state when no records exist
  return NextResponse.json({
    activity: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  });
}
