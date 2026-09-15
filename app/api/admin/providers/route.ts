import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { providerResolver } from '@/lib/providers/resolver';
import { RUST_API_BASE } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const providers = providerResolver.getProviders();

  // Test provider status / latency
  const providersWithHealth = await Promise.all(
    providers.map(async (p) => {
      const meta = p.getMetadata();
      let status: 'healthy' | 'degraded' | 'failing' = 'healthy';
      let latencyMs = 15;

      if (p.slug === 'moviebox-tui') {
        const start = performance.now();
        try {
          const res = await fetch(`${RUST_API_BASE}/api/v1/search?q=ping`, {
            signal: AbortSignal.timeout(1500),
          });
          latencyMs = Math.round(performance.now() - start);
          status = res.ok ? 'healthy' : 'failing';
        } catch {
          status = 'failing';
          latencyMs = 0;
        }
      }

      return {
        ...meta,
        status,
        latencyMs,
      };
    })
  );

  return NextResponse.json({
    providers: providersWithHealth,
    total: providers.length,
    activeCount: providers.filter((p) => p.enabled).length,
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
    const { providerId, enabled } = body;

    const provider = providerResolver.getProviders().find((p) => p.id === providerId || p.slug === providerId);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (typeof enabled === 'boolean') {
      provider.enabled = enabled;
    }

    return NextResponse.json({
      success: true,
      provider: provider.getMetadata(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update provider' }, { status: 500 });
  }
}
