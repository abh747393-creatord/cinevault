import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  MIDNIGHT_COOKIE_NAME,
  verifyMidnightSessionToken,
} from '@/lib/security/midnight-session';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';

function isHindiOrDub(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('hindi') ||
    t.includes('[hindi]') ||
    t.includes('dub') ||
    t.includes('tamil') ||
    t.includes('telugu') ||
    t.includes('bengali') ||
    t.includes('marathi')
  );
}

function isAnimeOrHentai(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('hentai') ||
    t.includes('anime') ||
    t.includes('wa ') ||
    t.includes('no ') ||
    t.includes('shiyo') ||
    t.includes('chuu')
  );
}

export async function GET(request: NextRequest) {
  // 1. Verify Midnight is globally enabled
  const settings = await getMidnightSettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { error: 'Midnight is currently unavailable.' },
      { status: 403 }
    );
  }

  // 2. Verify Session & 18+ Disclaimer Acceptance
  const cookieToken = request.cookies.get(MIDNIGHT_COOKIE_NAME)?.value;
  const session = verifyMidnightSessionToken(cookieToken, settings.passcodeVersion);

  if (!session.valid || !session.disclaimerAccepted) {
    return NextResponse.json(
      { error: 'Unauthorized. Passcode and 18+ disclaimer verification required.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const typeFilter = searchParams.get('type') || 'all';
  const langFilter = searchParams.get('language') || 'all';
  const yearFilter = searchParams.get('year') || 'all';

  if (!q) {
    return NextResponse.json({ items: [], page, hasMore: false });
  }

  try {
    const rawResults = await movieboxApi.search(q, 'moviebox', page);
    let items: MovieBoxCatalogItem[] = Array.isArray(rawResults) ? rawResults : [];

    // Filter by type
    if (typeFilter === 'movie') {
      items = items.filter((i) => i.media_type === 'movie');
    } else if (typeFilter === 'tv') {
      items = items.filter((i) => i.media_type === 'series');
    } else if (typeFilter === 'anime') {
      items = items.filter((i) => isAnimeOrHentai(i.title));
    }

    // Filter by language
    if (langFilter === 'hindi') {
      items = items.filter((i) => isHindiOrDub(i.title));
    } else if (langFilter === 'english') {
      items = items.filter((i) => !isHindiOrDub(i.title));
    } else if (langFilter === 'japanese') {
      items = items.filter((i) => isAnimeOrHentai(i.title));
    }

    // Filter by year
    if (yearFilter && yearFilter !== 'all') {
      const targetYear = parseInt(yearFilter, 10);
      if (yearFilter === 'older') {
        items = items.filter((i) => parseInt(i.year || '0', 10) <= 2022);
      } else if (!isNaN(targetYear)) {
        items = items.filter((i) => parseInt(i.year || '0', 10) === targetYear);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = items.filter((i) => {
      const id = i.id?.value || (typeof i.id === 'string' ? i.id : '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return NextResponse.json({
      items: unique,
      page,
      hasMore: rawResults.length >= 10,
    });
  } catch (err: any) {
    console.error('[MidnightSearchAPI] Upstream search error:', err);
    return NextResponse.json(
      { error: 'Failed to execute search.' },
      { status: 502 }
    );
  }
}
