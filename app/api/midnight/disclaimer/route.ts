import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  MIDNIGHT_COOKIE_NAME,
  MIDNIGHT_SESSION_TTL_SECONDS,
  verifyMidnightSessionToken,
  createMidnightSessionToken,
} from '@/lib/security/midnight-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accept = Boolean(body?.accept);

    const settings = await getMidnightSettings();
    if (!settings.enabled) {
      const res = NextResponse.json({ error: 'Midnight is unavailable.' }, { status: 403 });
      res.cookies.delete(MIDNIGHT_COOKIE_NAME);
      return res;
    }

    const cookieToken = request.cookies.get(MIDNIGHT_COOKIE_NAME)?.value;
    const session = verifyMidnightSessionToken(cookieToken, settings.passcodeVersion);

    if (!session.valid) {
      const res = NextResponse.json(
        { error: 'Valid passcode required before disclaimer acceptance.' },
        { status: 401 }
      );
      res.cookies.delete(MIDNIGHT_COOKIE_NAME);
      return res;
    }

    const response = NextResponse.json({ success: true, accepted: accept });

    if (accept) {
      // Elevate session with disclaimer accepted
      const updatedToken = createMidnightSessionToken(settings.passcodeVersion, true);
      response.cookies.set({
        name: MIDNIGHT_COOKIE_NAME,
        value: updatedToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: MIDNIGHT_SESSION_TTL_SECONDS,
        path: '/',
      });
    } else {
      // User declined / exited
      response.cookies.delete(MIDNIGHT_COOKIE_NAME);
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to process disclaimer.' }, { status: 500 });
  }
}
