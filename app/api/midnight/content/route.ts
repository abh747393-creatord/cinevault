import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  MIDNIGHT_COOKIE_NAME,
  verifyMidnightSessionToken,
} from '@/lib/security/midnight-session';
import { movieboxApi } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Verify Midnight is globally enabled
  const settings = await getMidnightSettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { error: 'Midnight is currently unavailable.' },
      { status: 403 }
    );
  }

  // 2. Verify Session & 18+ Disclaimer Acceptance
  const cookieToken = request.cookies.get(MIDNIGHT_COOKIE_NAME)?.value;
  const session = verifyMidnightSessionToken(cookieToken, settings.passcodeVersion);

  if (!session.valid || !session.disclaimerAccepted) {
    return NextResponse.json(
      { error: 'Unauthorized. Passcode and 18+ disclaimer verification required.' },
      { status: 401 }
    );
  }

  // 3. Extract pagination
  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

  // 4. Fetch genuine upstream Midnight feed (tab=9)
  try {
    const upstreamFeed = await movieboxApi.homepage('9', page);
    return NextResponse.json(upstreamFeed || { items: [], metrics: {} });
  } catch (err: any) {
    console.error('[MidnightContentAPI] Upstream fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Midnight catalog from upstream provider.' },
      { status: 502 }
    );
  }
}
