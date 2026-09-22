import { NextRequest, NextResponse } from 'next/server';
import { RUST_API_BASE } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const subPath = (params.path || []).join('/');
  const search = request.nextUrl.search || '';
  const targetUrl = `${RUST_API_BASE}/api/v1/${subPath}${search}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    clearTimeout(timer);
    const isAborted = controller.signal.aborted || err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    console.error(`[ApiV1Proxy] Failed to fetch ${targetUrl}:`, err?.message || err);
    return NextResponse.json(
      {
        error: isAborted ? 'Upstream request timed out' : 'Unable to connect to streaming backend',
        details: String(err?.message || err),
        targetUrl,
        aborted: controller.signal.aborted,
      },
      { status: 504 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
