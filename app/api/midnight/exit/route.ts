import { NextRequest, NextResponse } from 'next/server';
import { MIDNIGHT_COOKIE_NAME } from '@/lib/security/midnight-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Exited Midnight.' });
  response.cookies.delete(MIDNIGHT_COOKIE_NAME);
  return response;
}
