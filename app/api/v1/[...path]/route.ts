import { NextRequest, NextResponse } from 'next/server';
import { RUST_API_BASE } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
};

async function handleProxy(
  request: NextRequest,
  params: { path: string[] },
  method: 'GET' | 'HEAD'
) {
  const subPath = (params.path || []).join('/');
  const search = request.nextUrl.search || '';
  const targetUrl = `${RUST_API_BASE}/api/v1/${subPath}${search}`;

  const isStreamProxy = subPath.includes('stream/proxy');
  const isStreamsReq = subPath.includes('streams');

  // Forward crucial streaming headers
  const forwardHeaders: Record<string, string> = {};
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) forwardHeaders['Range'] = rangeHeader;
  const acceptHeader = request.headers.get('accept');
  if (acceptHeader) forwardHeaders['Accept'] = acceptHeader;
  const ifRange = request.headers.get('if-range');
  if (ifRange) forwardHeaders['If-Range'] = ifRange;

  const controller = new AbortController();
  const timeoutMs = isStreamProxy ? 25000 : 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      signal: controller.signal,
      headers: forwardHeaders,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status, headers: CORS_HEADERS }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isMpd =
      subPath.endsWith('.mpd') ||
      contentType.includes('application/dash+xml') ||
      contentType.includes('text/xml');

    // Case 1: DASH Manifest XML -> Rewrite BaseURL to relative proxy path
    if (isMpd && method === 'GET') {
      const rawXml = await upstreamRes.text();
      const ticketMatch = subPath.match(/stream\/proxy\/([^/]+)/);
      const ticket = ticketMatch ? ticketMatch[1] : '';

      let rewrittenXml = rawXml;
      if (ticket) {
        rewrittenXml = rawXml.replace(
          /<BaseURL>https?:\/\/[^<]+<\/BaseURL>/gi,
          `<BaseURL>/api/v1/stream/proxy/${ticket}/</BaseURL>`
        );
      }

      // Normalize HEVC FourCC from hev1 to hvc1 so Chromium browsers with hardware HEVC can decode
      rewrittenXml = rewrittenXml.replace(/codecs="hev1/g, 'codecs="hvc1');

      const headers = new Headers();
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        headers.set(k, v);
      }
      headers.set('Content-Type', 'application/dash+xml; charset=utf-8');
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      return new NextResponse(rewrittenXml, {
        status: upstreamRes.status,
        headers,
      });
    }

    // Case 2: Binary media stream (m4s chunk, mp4, etc.)
    if (isStreamProxy || !contentType.includes('application/json')) {
      const responseHeaders = new Headers();
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(k, v);
      }

      responseHeaders.set(
        'Content-Type',
        contentType || (subPath.endsWith('.m4s') ? 'video/iso.segment' : 'video/mp4')
      );

      const cl = upstreamRes.headers.get('content-length');
      if (cl) responseHeaders.set('Content-Length', cl);
      const cr = upstreamRes.headers.get('content-range');
      if (cr) responseHeaders.set('Content-Range', cr);
      const ar = upstreamRes.headers.get('accept-ranges');
      if (ar) responseHeaders.set('Accept-Ranges', ar);

      // Media chunks are immutable
      responseHeaders.set(
        'Cache-Control',
        subPath.endsWith('.m4s')
          ? 'public, max-age=86400, immutable'
          : 'no-cache, no-store, must-revalidate'
      );

      if (method === 'HEAD') {
        return new NextResponse(null, {
          status: upstreamRes.status,
          headers: responseHeaders,
        });
      }

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    // Case 3: JSON data responses (details, homepage, search, streams)
    const data = await upstreamRes.json();
    const headers: Record<string, string> = {
      ...CORS_HEADERS,
      'Cache-Control': isStreamsReq
        ? 'no-store, no-cache, must-revalidate'
        : 'public, s-maxage=60, stale-while-revalidate=180',
    };

    return NextResponse.json(data, { headers });
  } catch (err: any) {
    clearTimeout(timer);
    const isAborted =
      controller.signal.aborted || err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    console.error(`[ApiV1Proxy] Failed to fetch ${targetUrl}:`, err?.message || err);
    return NextResponse.json(
      {
        error: 'Backend Service Unavailable',
        status: 503,
        diagnostic: isAborted
          ? 'The CineVault streaming backend timed out while fulfilling the request.'
          : 'The CineVault streaming backend is currently offline or unreachable. Please verify that the backend daemon and network tunnel are active.',
        details: String(err?.message || err),
      },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params, 'GET');
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params, 'HEAD');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}
