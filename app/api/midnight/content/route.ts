import { NextRequest, NextResponse } from 'next/server';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import {
  MIDNIGHT_COOKIE_NAME,
  verifyMidnightSessionToken,
} from '@/lib/security/midnight-session';
import { movieboxApi, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';

export const dynamic = 'force-dynamic';

// In-memory cache for Tab 9 catalog items (10 min TTL)
let tab9Cache: { items: MovieBoxCatalogItem[]; metrics: any; expiresAt: number } | null = null;

async function getTab9Catalog(): Promise<{ items: MovieBoxCatalogItem[]; metrics: any }> {
  const now = Date.now();
  if (tab9Cache && tab9Cache.expiresAt > now) {
    return { items: tab9Cache.items, metrics: tab9Cache.metrics };
  }

  try {
    const upstreamFeed = await movieboxApi.homepage('9', 1);
    const items: MovieBoxCatalogItem[] = Array.isArray(upstreamFeed)
      ? upstreamFeed
      : (upstreamFeed as any)?.items || [];
    const metrics = (upstreamFeed as any)?.metrics || {};

    tab9Cache = {
      items,
      metrics,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
    };

    return { items, metrics };
  } catch (err) {
    if (tab9Cache) {
      return { items: tab9Cache.items, metrics: tab9Cache.metrics };
    }
    throw err;
  }
}

// Helpers to identify metadata from titles
function isHindiOrDub(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('hindi') ||
    t.includes('[hindi]') ||
    t.includes('dub') ||
    t.includes('tamil') ||
    t.includes('telugu') ||
    t.includes('bengali') ||
    t.includes('marathi') ||
    t.includes('kannada') ||
    t.includes('malayalam')
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
    t.includes('chuu') ||
    t.includes('senpai') ||
    t.includes('kouhai')
  );
}

function matchesSearchQuery(item: MovieBoxCatalogItem, q: string): boolean {
  if (!q) return true;
  const lowerQ = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(lowerQ) ||
    Boolean(item.year && item.year.includes(lowerQ))
  );
}

function matchesFilters(
  item: MovieBoxCatalogItem,
  filters: { type: string; language: string; year: string }
): boolean {
  const { type, language, year } = filters;

  // Type filter
  if (type === 'movie' && item.media_type !== 'movie') return false;
  if (type === 'tv' && item.media_type !== 'series') return false;
  if (type === 'anime' && !isAnimeOrHentai(item.title)) return false;

  // Language filter
  if (language === 'hindi' && !isHindiOrDub(item.title)) return false;
  if (language === 'english' && isHindiOrDub(item.title)) return false;
  if (language === 'japanese' && !isAnimeOrHentai(item.title)) return false;

  // Release year filter
  if (year && year !== 'all') {
    const itemYear = parseInt(item.year || '0', 10);
    if (year === '2026' && itemYear !== 2026) return false;
    if (year === '2025' && itemYear !== 2025) return false;
    if (year === '2024' && itemYear !== 2024) return false;
    if (year === '2023' && itemYear !== 2023) return false;
    if (year === 'older' && itemYear > 2022) return false;
  }

  return true;
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

  // 3. Extract parameters
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || 'all').toLowerCase();
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10), 1), 60);
  const typeFilter = searchParams.get('type') || 'all';
  const langFilter = searchParams.get('language') || 'all';
  const yearFilter = searchParams.get('year') || 'all';
  const sortFilter = searchParams.get('sort') || 'default';
  const query = (searchParams.get('q') || '').trim();

  try {
    const { items: baseItems, metrics } = await getTab9Catalog();
    const seenIds = new Set<string>();

    let categoryItems: MovieBoxCatalogItem[] = [];
    let hasMore = true;

    // Fetch or prepare items based on the requested category
    switch (category) {
      case 'movies': {
        // Core Tab 9 movies
        const tab9Movies = baseItems.filter((i) => i.media_type === 'movie');
        categoryItems = [...tab9Movies];

        // For deeper pagination beyond tab 9, fetch upstream adult movie searches
        if (page > Math.ceil(tab9Movies.length / limit) || tab9Movies.length < limit * page) {
          const upstreamPage = Math.max(page - Math.floor(tab9Movies.length / limit), 1);
          try {
            const extra = await movieboxApi.search('adult movie', 'moviebox', upstreamPage);
            categoryItems.push(...(extra || []));
          } catch {}
        }
        break;
      }

      case 'series': {
        // Core Tab 9 series
        const tab9Series = baseItems.filter((i) => i.media_type === 'series');
        categoryItems = [...tab9Series];

        // Fetch upstream adult web series (e.g. Ullu, adult series)
        try {
          const [ulluRes, adultSeriesRes] = await Promise.allSettled([
            movieboxApi.search('ullu', 'moviebox', page),
            movieboxApi.search('adult series', 'moviebox', page),
          ]);
          if (ulluRes.status === 'fulfilled' && Array.isArray(ulluRes.value)) {
            categoryItems.push(...ulluRes.value);
          }
          if (adultSeriesRes.status === 'fulfilled' && Array.isArray(adultSeriesRes.value)) {
            categoryItems.push(...adultSeriesRes.value);
          }
        } catch {}
        break;
      }

      case 'erotic': {
        // Search upstream erotic catalog with real pagination
        try {
          const [eroticRes, sensualRes] = await Promise.allSettled([
            movieboxApi.search('erotic', 'moviebox', page),
            movieboxApi.search('sensual', 'moviebox', page),
          ]);
          if (eroticRes.status === 'fulfilled' && Array.isArray(eroticRes.value)) {
            categoryItems.push(...eroticRes.value);
          }
          if (sensualRes.status === 'fulfilled' && Array.isArray(sensualRes.value)) {
            categoryItems.push(...sensualRes.value);
          }
          // Also include any Tab 9 erotic titles on page 1
          if (page === 1) {
            const eroticTab9 = baseItems.filter(
              (i) => i.title.toLowerCase().includes('erotic') || i.title.toLowerCase().includes('sex')
            );
            categoryItems.unshift(...eroticTab9);
          }
        } catch {}
        break;
      }

      case 'anime': {
        // Adult Anime & Hentai catalog with upstream pagination
        try {
          const [hentaiRes, animeRes] = await Promise.allSettled([
            movieboxApi.search('hentai', 'moviebox', page),
            movieboxApi.search('adult anime', 'moviebox', page),
          ]);
          if (hentaiRes.status === 'fulfilled' && Array.isArray(hentaiRes.value)) {
            categoryItems.push(...hentaiRes.value);
          }
          if (animeRes.status === 'fulfilled' && Array.isArray(animeRes.value)) {
            categoryItems.push(...animeRes.value);
          }
          // Include any Tab 9 anime titles on page 1
          if (page === 1) {
            const animeTab9 = baseItems.filter((i) => isAnimeOrHentai(i.title));
            categoryItems.unshift(...animeTab9);
          }
        } catch {}
        break;
      }

      case 'dubbed': {
        // Hindi dubbed adult productions
        const dubbedTab9 = baseItems.filter((i) => isHindiOrDub(i.title));
        categoryItems = [...dubbedTab9];

        try {
          const [hindiHotRes, hindiEroticRes] = await Promise.allSettled([
            movieboxApi.search('hindi hot', 'moviebox', page),
            movieboxApi.search('hindi erotic', 'moviebox', page),
          ]);
          if (hindiHotRes.status === 'fulfilled' && Array.isArray(hindiHotRes.value)) {
            categoryItems.push(...hindiHotRes.value);
          }
          if (hindiEroticRes.status === 'fulfilled' && Array.isArray(hindiEroticRes.value)) {
            categoryItems.push(...hindiEroticRes.value);
          }
        } catch {}
        break;
      }

      case 'recent': {
        // Recently added: sorted by newest year
        const sortedTab9 = [...baseItems].sort(
          (a, b) => parseInt(b.year || '0', 10) - parseInt(a.year || '0', 10)
        );
        categoryItems = [...sortedTab9];

        if (page > Math.ceil(sortedTab9.length / limit)) {
          const extraPage = page - Math.floor(sortedTab9.length / limit);
          try {
            const extra = await movieboxApi.search('2026 adult', 'moviebox', extraPage);
            categoryItems.push(...(extra || []));
          } catch {}
        }
        break;
      }

      case 'popular': {
        // Popular / Highest metric items
        const sortedPopular = [...baseItems].sort((a, b) => {
          const scoreA = metrics[a.id?.value]?.popularity || metrics[a.id?.value]?.rating || 0;
          const scoreB = metrics[b.id?.value]?.popularity || metrics[b.id?.value]?.rating || 0;
          return scoreB - scoreA;
        });
        categoryItems = [...sortedPopular];

        if (page > Math.ceil(sortedPopular.length / limit)) {
          const extraPage = page - Math.floor(sortedPopular.length / limit);
          try {
            const extra = await movieboxApi.search('hot', 'moviebox', extraPage);
            categoryItems.push(...(extra || []));
          } catch {}
        }
        break;
      }

      case 'all':
      default: {
        // All Midnight: base is Tab 9 (127 items)
        categoryItems = [...baseItems];

        // For pages beyond Tab 9, seamlessly extend with upstream adult catalog queries
        if (page > Math.ceil(baseItems.length / limit)) {
          const extraPage = page - Math.floor(baseItems.length / limit);
          try {
            const [eroticExtra, adultExtra] = await Promise.allSettled([
              movieboxApi.search('erotic', 'moviebox', extraPage),
              movieboxApi.search('adult', 'moviebox', extraPage),
            ]);
            if (eroticExtra.status === 'fulfilled' && Array.isArray(eroticExtra.value)) {
              categoryItems.push(...eroticExtra.value);
            }
            if (adultExtra.status === 'fulfilled' && Array.isArray(adultExtra.value)) {
              categoryItems.push(...adultExtra.value);
            }
          } catch {}
        }
        break;
      }
    }

    // Deduplicate items
    const uniqueList: MovieBoxCatalogItem[] = [];
    for (const item of categoryItems) {
      const idVal = item.id?.value || (typeof item.id === 'string' ? item.id : '');
      if (!idVal || seenIds.has(String(idVal))) continue;
      seenIds.add(String(idVal));
      uniqueList.push(item);
    }

    // Apply Search Query if present
    let filteredList = uniqueList;
    if (query) {
      filteredList = filteredList.filter((item) => matchesSearchQuery(item, query));
    }

    // Apply Filters (Type, Language, Year)
    filteredList = filteredList.filter((item) =>
      matchesFilters(item, { type: typeFilter, language: langFilter, year: yearFilter })
    );

    // Apply Sort
    if (sortFilter === 'newest') {
      filteredList.sort((a, b) => parseInt(b.year || '0', 10) - parseInt(a.year || '0', 10));
    } else if (sortFilter === 'oldest') {
      filteredList.sort((a, b) => parseInt(a.year || '0', 10) - parseInt(b.year || '0', 10));
    } else if (sortFilter === 'title') {
      filteredList.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Slice for current page
    // Note: For categories where items were pre-assembled (like tab9-based), slice by (page - 1) * limit
    // For pure search categories, if we fetched page-specifically, take up to limit
    const startIndex = (page - 1) * limit;
    const paginatedItems =
      startIndex < filteredList.length
        ? filteredList.slice(startIndex, startIndex + limit)
        : filteredList.slice(0, limit);

    // Determine hasMore
    // If we have items beyond this slice, or if upstream search returned items
    const hasMoreItems =
      startIndex + limit < filteredList.length ||
      (paginatedItems.length >= limit && ['all', 'movies', 'series', 'erotic', 'anime', 'dubbed'].includes(category));

    return NextResponse.json({
      items: paginatedItems,
      page,
      limit,
      hasMore: hasMoreItems,
      totalAvailable: filteredList.length,
      category,
      metrics,
    });
  } catch (err: any) {
    console.error('[MidnightContentAPI] Catalog error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Midnight catalog from upstream provider.' },
      { status: 502 }
    );
  }
}
