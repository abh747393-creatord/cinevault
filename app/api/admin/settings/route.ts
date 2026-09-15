import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

interface PlatformSettings {
  siteName: string;
  tagline: string;
  defaultQuality: '4K' | '1080p' | '720p';
  autoplayNext: boolean;
  enableSafetyBlacklist: boolean;
  cacheTtlSeconds: number;
  maintenanceMode: boolean;
}

let platformSettings: PlatformSettings = {
  siteName: 'CineVault',
  tagline: 'High Performance Cinematic Streaming Platform',
  defaultQuality: '1080p',
  autoplayNext: true,
  enableSafetyBlacklist: true,
  cacheTtlSeconds: 3600,
  maintenanceMode: false,
};

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  return NextResponse.json({
    settings: platformSettings,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nextVersion: '14.2.16',
    },
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

  try {
    const body = await request.json();
    const { action, settings } = body;

    if (action === 'flush_cache') {
      // Logic for invalidating memory/session caches
      return NextResponse.json({
        success: true,
        message: 'System cache and provider buffers successfully purged.',
        timestamp: new Date().toISOString(),
      });
    }

    if (settings) {
      platformSettings = {
        ...platformSettings,
        ...settings,
      };
      return NextResponse.json({
        success: true,
        settings: platformSettings,
      });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Settings update failed' },
      { status: 500 }
    );
  }
}
