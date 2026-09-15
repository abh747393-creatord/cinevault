import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const userId = params.id;
  const supabase = getAdminClient() || getServerClient();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!pErr && profile) {
        // Fetch user watch history
        const { data: watchHistory } = await supabase
          .from('watch_history')
          .select('*, content(id, title, poster_url, content_type)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(20);

        // Fetch user watchlist
        const { data: watchlist } = await supabase
          .from('watchlist')
          .select('*, content(id, title, poster_url, content_type)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        return NextResponse.json({
          user: {
            id: profile.id,
            email: profile.email || `${profile.username || 'user'}@cinevault.local`,
            username: profile.username || 'user',
            displayName: profile.display_name || 'User',
            role: profile.role || 'user',
            avatarUrl: profile.avatar_url,
            preferredLanguage: profile.preferred_language || 'English',
            defaultQuality: profile.default_quality || '1080p',
            createdAt: profile.created_at,
          },
          watchHistory: watchHistory || [],
          watchlist: watchlist || [],
        });
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
    }
  }

  // Fallback demo user response
  return NextResponse.json({
    user: {
      id: userId,
      email: `${userId}@cinevault.local`,
      username: userId,
      displayName: `User ${userId}`,
      role: 'user',
      avatarUrl: null,
      preferredLanguage: 'English',
      defaultQuality: '1080p',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    watchHistory: [],
    watchlist: [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const userId = params.id;
  const body = await request.json();
  const { role, displayName, username } = body;

  const validRoles = ['user', 'moderator', 'admin'];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  }

  const supabase = getAdminClient() || getServerClient();

  if (isSupabaseConfigured && supabase) {
    try {
      const updateData: Record<string, any> = {};
      if (role) updateData.role = role;
      if (displayName) updateData.display_name = displayName;
      if (username) updateData.username = username;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, user: data });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Database update failed' }, { status: 500 });
    }
  }

  // Demo mode success
  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      role: role || 'user',
      displayName: displayName || 'Updated User',
      username: username || 'user',
    },
  });
}
