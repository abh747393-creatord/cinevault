import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const DEMO_USERS = [
  {
    id: 'demo-admin-123',
    email: 'admin@cinevault.local',
    username: 'superadmin',
    displayName: 'Super Admin',
    role: 'admin',
    avatarUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    preferredLanguage: 'English',
    defaultQuality: '1080p',
    watchCount: 14,
  },
  {
    id: 'demo-user-1',
    email: 'marcus.vance@example.com',
    username: 'marcusv',
    displayName: 'Marcus Vance',
    role: 'user',
    avatarUrl: null,
    createdAt: '2024-02-15T10:20:00.000Z',
    preferredLanguage: 'English',
    defaultQuality: '4K',
    watchCount: 28,
  },
  {
    id: 'demo-user-2',
    email: 'elena.rostova@example.com',
    username: 'elenar',
    displayName: 'Elena Rostova',
    role: 'moderator',
    avatarUrl: null,
    createdAt: '2024-03-01T14:45:00.000Z',
    preferredLanguage: 'English',
    defaultQuality: '1080p',
    watchCount: 45,
  },
  {
    id: 'demo-user-3',
    email: 'kenji.sato@example.com',
    username: 'kenjis',
    displayName: 'Kenji Sato',
    role: 'user',
    avatarUrl: null,
    createdAt: '2024-03-20T08:15:00.000Z',
    preferredLanguage: 'Japanese',
    defaultQuality: '1080p',
    watchCount: 19,
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

  // Fallback to Demo Users
  let filtered = [...DEMO_USERS];
  if (role !== 'all') {
    filtered = filtered.filter((u) => u.role === role);
  }
  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.username.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    users: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
