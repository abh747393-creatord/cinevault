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
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const role = searchParams.get('role') || 'all';

  const supabase = getAdminClient() || getServerClient();

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' });

      if (role !== 'all') {
        query = query.eq('role', role);
      }

      if (search) {
        query = query.or(
          `username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const offset = (page - 1) * limit;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        const total = count ?? data.length;
        const mappedUsers = data.map((u) => ({
          id: u.id,
          email: u.email || `${u.username || 'user'}@cinevault.local`,
          username: u.username || 'user',
          displayName: u.display_name || u.username || 'User',
          role: u.role || 'user',
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
          preferredLanguage: u.preferred_language || 'English',
          defaultQuality: u.default_quality || '1080p',
          watchCount: 0,
        }));

        return NextResponse.json({
          users: mappedUsers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    } catch (e) {
      console.error('Database query error in admin users API:', e);
    }
  }

  // Clean empty state when no database records exist
  return NextResponse.json({
    users: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  });
}
