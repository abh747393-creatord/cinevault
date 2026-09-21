import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  verifyPasscode,
  checkPasscodeRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
} from '@/lib/security/midnight-security';
import {
  MIDNIGHT_COOKIE_NAME,
  MIDNIGHT_SESSION_TTL_SECONDS,
  createMidnightSessionToken,
} from '@/lib/security/midnight-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // 1. Check Rate Limit
  const rateLimit = checkPasscodeRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Please wait ${rateLimit.retryAfterSeconds || 900} seconds.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';

    if (!passcode) {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    // 2. Load settings
    const settings = await getMidnightSettings();
    if (!settings.enabled) {
      return NextResponse.json(
        { error: 'Midnight is currently unavailable.' },
        { status: 403 }
      );
    }

    // 3. Verify passcode
    const isCorrect = verifyPasscode(passcode, settings.passcodeHash);

    if (!isCorrect) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid passcode.' }, { status: 401 });
    }

    // Passcode accepted - reset rate limit counter
    resetFailedAttempts(ip);

    // 4. Issue session token (disclaimer not accepted yet)
    const token = createMidnightSessionToken(settings.passcodeVersion, false);

    const response = NextResponse.json({
      success: true,
      disclaimerRequired: true,
    });

    response.cookies.set({
      name: MIDNIGHT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MIDNIGHT_SESSION_TTL_SECONDS,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}
