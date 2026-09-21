import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  MIDNIGHT_COOKIE_NAME,
  verifyMidnightSessionToken,
} from '@/lib/security/midnight-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const settings = await getMidnightSettings();

  if (!settings.enabled) {
    return NextResponse.json({
      enabled: false,
      authenticated: false,
      disclaimerAccepted: false,
    });
  }

  const cookieToken = request.cookies.get(MIDNIGHT_COOKIE_NAME)?.value;
  const session = verifyMidnightSessionToken(cookieToken, settings.passcodeVersion);

  return NextResponse.json({
    enabled: true,
    authenticated: session.valid,
    disclaimerAccepted: session.disclaimerAccepted,
  });
}
