import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = 'abh747393@gmail.com';

function extractUserEmailFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);
    
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload.email || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow admin login page without interception
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Intercept all /admin/* and /api/admin/* routes
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Check Supabase session cookies
  if (!token) {
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
        try {
          let val = decodeURIComponent(cookie.value);
          if (val.startsWith('base64-')) {
            val = atob(val.slice(7));
          }
          if (val.startsWith('[') || val.startsWith('{')) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
              token = parsed[0];
            } else if (parsed.access_token) {
              token = parsed.access_token;
            }
          } else if (val.split('.').length === 3) {
            token = val;
          }
        } catch {}
        if (token) break;
      }
    }
  }

  // If no token exists at all
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Unauthorized: Administrator authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extract email from JWT payload
  const email = extractUserEmailFromJwt(token);
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  // If token is invalid or does not match single authorized administrator
  if (!normalizedEmail || normalizedEmail !== ADMIN_EMAIL) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Forbidden: Access restricted to authorized administrator' },
        { status: 403 }
      );
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
