import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { authorized: false, error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  return NextResponse.json({
    authorized: true,
    user: auth.user,
  });
}
