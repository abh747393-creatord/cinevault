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

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const results = await movieboxApi.search(q);
    return NextResponse.json(results || []);
  } catch (err: any) {
    console.error('[MidnightSearchAPI] Upstream search error:', err);
    return NextResponse.json(
      { error: 'Failed to execute search.' },
      { status: 502 }
    );
  }
}
