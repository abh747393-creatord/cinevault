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

  // Test real provider status and latency
  const providersWithHealth = await Promise.all(
    providers.map(async (p) => {
      const meta = p.getMetadata();
      let status: 'healthy' | 'degraded' | 'failing' = 'healthy';
      let latencyMs = 0;

      if (p.slug === 'sign-ultra-vip' || p.slug === 'moviebox' || p.slug === 'moviebox-tui') {
        const start = performance.now();
        try {
          const res = await fetch(`${RUST_API_BASE}/health`, {
            signal: AbortSignal.timeout(2000),
          });
          latencyMs = Math.max(1, Math.round(performance.now() - start));
          status = res.ok ? 'healthy' : 'failing';
        } catch {
          status = 'failing';
          latencyMs = 0;
        }
      } else if (p.slug === 'supabase-catalog') {
        const start = performance.now();
        try {
          const { getServerClient } = await import('@/lib/supabase/server');
          const supabase = getServerClient();
          if (supabase) {
            const { error } = await supabase.from('content').select('id').limit(1);
            latencyMs = Math.max(1, Math.round(performance.now() - start));
            status = error ? 'degraded' : 'healthy';
          } else {
            status = 'degraded';
          }
        } catch {
          status = 'failing';
          latencyMs = 0;
        }
      } else if (p.slug === 'tmdb') {
        if (!process.env.TMDB_API_KEY) {
          status = 'degraded';
          latencyMs = 0;
        } else {
          const start = performance.now();
          try {
            const res = await fetch(
              `https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`,
              { signal: AbortSignal.timeout(2000) }
            );
            latencyMs = Math.max(1, Math.round(performance.now() - start));
            status = res.ok ? 'healthy' : 'failing';
          } catch {
            status = 'failing';
            latencyMs = 0;
          }
        }
      } else {
        // Open Cinema / in-memory catalog
        latencyMs = 1;
        status = 'healthy';
      }

      return {
        ...meta,
        name: p.slug === 'sign-ultra-vip' || p.slug === 'moviebox' ? 'Sign Ultra VIP Cinema' : meta.name,
        status: p.enabled ? status : 'disabled',
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
