import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getMidnightSettings, updateMidnightSettings } from '@/lib/security/midnight-store';
import { hashPasscode } from '@/lib/security/midnight-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const settings = await getMidnightSettings();

  return NextResponse.json({
    enabled: settings.enabled,
    isConfigured: Boolean(settings.passcodeHash),
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy,
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const adminEmail = auth.user?.email || 'admin';

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'change_passcode') {
      const newPasscode = typeof body?.newPasscode === 'string' ? body.newPasscode.trim() : '';

      if (!newPasscode || newPasscode.length < 4) {
        return NextResponse.json(
          { error: 'New passcode must be at least 4 characters long.' },
          { status: 400 }
        );
      }

      const passcodeHash = hashPasscode(newPasscode);
      const updated = await updateMidnightSettings({ passcodeHash }, adminEmail);

      return NextResponse.json({
        success: true,
        message: 'Midnight passcode changed successfully. All previous access sessions have been invalidated.',
        enabled: updated.enabled,
        isConfigured: true,
      });
    }

    if (action === 'toggle') {
      const enabled = Boolean(body?.enabled);
      const updated = await updateMidnightSettings({ enabled }, adminEmail);

      return NextResponse.json({
        success: true,
        message: `Midnight access ${enabled ? 'enabled' : 'disabled'} successfully.`,
        enabled: updated.enabled,
        isConfigured: Boolean(updated.passcodeHash),
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update Midnight settings.' },
      { status: 500 }
    );
  }
}
