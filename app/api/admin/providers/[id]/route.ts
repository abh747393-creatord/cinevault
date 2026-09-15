import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { providerResolver } from '@/lib/providers/resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const provider = providerResolver
    .getProviders()
    .find((p) => p.id === params.id || p.slug === params.id);

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  return NextResponse.json({
    provider: provider.getMetadata(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 401 }
    );
  }

  const provider = providerResolver
    .getProviders()
    .find((p) => p.id === params.id || p.slug === params.id);

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const query = body.query || 'Inception';

    const start = performance.now();
    const results = await provider.search(query);
    const latency = Math.round(performance.now() - start);

    return NextResponse.json({
      success: true,
      query,
      latencyMs: latency,
      count: results.length,
      results: results.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Diagnostic query failed', status: 'error' },
      { status: 500 }
    );
  }
}
