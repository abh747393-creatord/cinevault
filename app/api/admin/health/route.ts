import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { getServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  // 1. Rust Streaming Daemon Health
  let rustStatus: 'online' | 'offline' = 'offline';
  let rustLatency: number | null = null;
  const rustStart = performance.now();
  try {
    const rustRes = await fetch('http://localhost:8080/api/v1/health', {
      signal: AbortSignal.timeout(2500),
    });
    if (rustRes.ok) {
      rustStatus = 'online';
      rustLatency = Math.round(performance.now() - rustStart);
    }
  } catch {
    rustStatus = 'offline';
  }

  // 2. Supabase DB Health
  let dbStatus: 'connected' | 'demo_mode' | 'error' = 'demo_mode';
  let dbLatency: number | null = null;
  if (isSupabaseConfigured) {
    const dbStart = performance.now();
    try {
      const supabase = getServerClient();
      if (supabase) {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (!error) {
          dbStatus = 'connected';
          dbLatency = Math.round(performance.now() - dbStart);
        } else {
          dbStatus = 'error';
        }
      }
    } catch {
      dbStatus = 'error';
    }
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      nextServer: {
        status: 'online',
        port: 3000,
        env: process.env.NODE_ENV || 'development',
      },
      rustBackend: {
        status: rustStatus,
        port: 8080,
        latencyMs: rustLatency,
        endpoint: 'http://localhost:8080/api/v1',
      },
      supabase: {
        status: dbStatus,
        configured: isSupabaseConfigured,
        latencyMs: dbLatency,
      },
    },
    system: {
      uptimeSeconds: process.uptime(),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
}
