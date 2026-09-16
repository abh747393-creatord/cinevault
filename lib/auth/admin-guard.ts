import { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types/user';

import { ADMIN_EMAIL, normalizeEmail, isAuthorizedAdminEmail } from './admin-constants';
export { ADMIN_EMAIL, normalizeEmail, isAuthorizedAdminEmail };

export interface AdminAuthResult {
  authorized: boolean;
  user?: UserProfile | null;
  error?: string;
  statusCode?: number;
}

/**
 * Strict server-side verification of administrative authorization.
 * Only abh747393@gmail.com (normalized) with valid Supabase authentication is granted access.
 * Testing bypasses (x-admin-role, referer) are strictly prohibited.
 */
export async function verifyAdminRequest(request?: NextRequest): Promise<AdminAuthResult> {
  // If Supabase is not configured in the current environment
  if (!isSupabaseConfigured) {
    return {
      authorized: false,
      error: 'Supabase authentication is not configured.',
      statusCode: 503,
    };
  }

  const supabase = getServerClient();
  const adminClient = getAdminClient();

  if (!supabase && !adminClient) {
    return {
      authorized: false,
      error: 'Server authentication client initialization failed.',
      statusCode: 500,
    };
  }

  try {
    let userId: string | null = null;
    let userEmail: string = '';

    // 1. Check for Bearer token in Authorization header
    const authHeader = request?.headers?.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const client = adminClient || supabase;
      if (client) {
        const { data: tokenUser, error: tokenErr } = await client.auth.getUser(token);
        if (!tokenErr && tokenUser?.user) {
          userId = tokenUser.user.id;
          userEmail = tokenUser.user.email || '';
        }
      }
    }

    // 2. Check Supabase session cookies if not resolved via Bearer
    if (!userId && supabase) {
      const {
        data: { user: cookieUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && cookieUser) {
        userId = cookieUser.id;
        userEmail = cookieUser.email || '';
      } else {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!sessionError && session?.user) {
          userId = session.user.id;
          userEmail = session.user.email || '';
        }
      }
    }

    // Unauthenticated visitor
    if (!userId || !userEmail) {
      return {
        authorized: false,
        error: 'Unauthorized: Valid administrator session is required.',
        statusCode: 401,
      };
    }

    const normalizedEmail = normalizeEmail(userEmail);

    // Verify identity against the sole authorized administrator account
    if (normalizedEmail !== ADMIN_EMAIL) {
      return {
        authorized: false,
        error: 'Forbidden: Account does not have administrative privileges.',
        statusCode: 403,
      };
    }

    // Query profiles table for profile metadata
    const dbClient = adminClient || supabase;
    let profileData: any = null;

    if (dbClient) {
      const { data } = await dbClient
        .from('profiles')
        .select('id, username, display_name, role, avatar_url, preferred_language, preferred_subtitle_language, default_quality, autoplay_next, theme, created_at')
        .eq('id', userId)
        .single();
      profileData = data;
    }

    const adminUser: UserProfile = {
      id: userId,
      email: normalizedEmail,
      username: profileData?.username || normalizedEmail.split('@')[0] || 'admin',
      displayName: profileData?.display_name || 'Administrator',
      avatarUrl: profileData?.avatar_url || null,
      role: 'admin',
      preferredLanguage: profileData?.preferred_language || 'English',
      preferredSubtitleLanguage: profileData?.preferred_subtitle_language || 'English',
      defaultQuality: profileData?.default_quality || '1080p',
      autoplayNext: profileData?.autoplay_next ?? true,
      theme: profileData?.theme || 'dark',
      createdAt: profileData?.created_at || new Date().toISOString(),
    };

    return {
      authorized: true,
      user: adminUser,
    };
  } catch (err: any) {
    console.error('[AdminGuard] Verification failure:', err);
    return {
      authorized: false,
      error: 'Internal authorization check failure.',
      statusCode: 500,
    };
  }
}

/**
 * Server-side check for Server Components / Layouts.
 */
export async function checkServerAdmin(): Promise<{ isAdmin: boolean; user: UserProfile | null }> {
  const result = await verifyAdminRequest();
  return {
    isAdmin: result.authorized,
    user: result.user || null,
  };
}
