import { movieboxApi, MovieBoxCatalogItem, BrowseMetrics } from '@/lib/api/moviebox-client';
import { CollectionDefinition, ContentItem } from '@/types/content';
import { isLegitimateTitle, getCanonicalTitle } from '@/lib/utils/content-filter';

/**
 * Normalizes text for lenient keyword matching:
 * - Lowercases
 * - Strips punctuation, brackets, hyphens, and symbols
 * - Collapses extra spaces
 */
export function normalizeKeyword(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a haystack contains a needle using whole-word or token boundaries.
 */
export function containsKeyword(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  const normHaystack = ` ${normalizeKeyword(haystack)} `;
  const normNeedle = normalizeKeyword(needle);
  if (!normNeedle) return false;
  return normHaystack.includes(` ${normNeedle} `) || normHaystack.includes(normNeedle);
}

/**
 * Evaluates how strongly an upstream item matches a collection definition.
 * Returns a numerical score. A score >= 5 is considered a match.
 */
export function scoreItemForCollection(
  item: MovieBoxCatalogItem,
  collection: CollectionDefinition,
  additionalMetadata?: {
    genres?: string[];
    language?: string;
    description?: string;
  }
): number {
  if (!item || !item.title) return 0;

  // 1. Safety check: exclude explicit adult content & trailers/mockbusters
  const isAdultAllowed = collection.slug.includes('adult') || collection.slug.includes('midnight');
  if (!isLegitimateTitle(item.title, item.year, isAdultAllowed)) {
    return 0;
  }

  let score = 0;
  const titleNorm = normalizeKeyword(item.title);
  const rawTitleLower = item.title.toLowerCase();
  const descNorm = additionalMetadata?.description ? normalizeKeyword(additionalMetadata.description) : '';
  const itemGenres = additionalMetadata?.genres?.map(g => normalizeKeyword(g)) || [];
  const itemLang = additionalMetadata?.language ? normalizeKeyword(additionalMetadata.language) : '';

  // 2. Media type alignment (Soft preference rather than hard rejection)
  if (collection.mediaType === 'movie') {
    if (item.media_type === 'movie') score += 2;
  } else if (collection.mediaType === 'series') {
    if (item.media_type === 'series') score += 2;
  }

  // 3. Provider Category / Tab Alignment
  if (collection.providerTab) {
    if (collection.providerTab === 'movie' && item.media_type === 'movie') score += 2;
    if (collection.providerTab === 'tv' && item.media_type === 'series') score += 2;
  }

  // 4. Language & Audio Hints Check (Crucial for K-Drama, C-Drama, Anime English Dubbed, Hindi)
  if (collection.languageHints && collection.languageHints.length > 0) {
    for (const hint of collection.languageHints) {
      const normHint = normalizeKeyword(hint);
      if (containsKeyword(item.title, normHint)) {
        score += 8;
      }
      if (itemLang && containsKeyword(itemLang, normHint)) {
        score += 10;
      }
    }
  }

  // 5. Genre Alignment
  if (collection.genres && collection.genres.length > 0) {
    for (const colGenre of collection.genres) {
      const normColGenre = normalizeKeyword(colGenre);
      if (itemGenres.some(g => g.includes(normColGenre) || normColGenre.includes(g))) {
        score += 10;
      }
      if (descNorm && containsKeyword(descNorm, normColGenre)) {
        score += 4;
      }
      if (containsKeyword(titleNorm, normColGenre)) {
        score += 5;
      }
    }
  }

  // 6. Keywords Matching (Primary search tokens)
  const keywords = collection.keywords || [];
  if (keywords.length > 0) {
    for (const kw of keywords) {
      const normKw = normalizeKeyword(kw);
      if (!normKw) continue;

      if (containsKeyword(titleNorm, normKw)) {
        score += 8;
      } else if (descNorm && containsKeyword(descNorm, normKw)) {
        score += 4;
      } else if (itemGenres.some(g => g.includes(normKw))) {
        score += 6;
      }
    }
  }

  // 7. Search Queries & Title Hints (Targeted queries like "Avengers", "Queen of Tears", "Batman")
  const searchQueries = collection.searchQueries || [];
  for (const sq of searchQueries) {
    const normSq = normalizeKeyword(sq);
    if (!normSq) continue;
    if (containsKeyword(titleNorm, normSq)) {
      score += 10;
    }
  }

  if (collection.titleHints && collection.titleHints.length > 0) {
    for (const hint of collection.titleHints) {
      const normHint = normalizeKeyword(hint);
      if (containsKeyword(titleNorm, normHint)) {
        score += 10;
      }
    }
  }

  // 8. Explicit required keywords check if specified
  if (collection.requiredKeywords && collection.requiredKeywords.length > 0) {
    const matchesRequired = collection.requiredKeywords.some(kw =>
      containsKeyword(rawTitleLower, normalizeKeyword(kw))
    );
    if (!matchesRequired) {
      return 0;
    }
  }

  return score;
}

/**
 * Filter, score, and deduplicate items for a collection.
 */
export function getCollectionItems(
  collection: CollectionDefinition,
  rawItems: MovieBoxCatalogItem[],
  metrics?: Record<string, BrowseMetrics>
): ContentItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const seenIds = new Set<string>();
  const seenCanonicalTitles = new Set<string>();
  const scoredItems: { item: MovieBoxCatalogItem; score: number }[] = [];

  for (const it of rawItems) {
    if (!it || !it.id?.value) continue;
    const idVal = it.id.value;
    if (seenIds.has(idVal)) continue;

    const score = scoreItemForCollection(it, collection);
    if (score >= 5) {
      seenIds.add(idVal);
      scoredItems.push({ item: it, score });
    }
  }

  // Sort by score descending, then by year descending
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const yearA = parseInt(a.item.year || '0', 10) || 0;
    const yearB = parseInt(b.item.year || '0', 10) || 0;
    return yearB - yearA;
  });

  const result: ContentItem[] = [];

  for (const { item } of scoredItems) {
    const cleanTitle = getCanonicalTitle(item.title);
    const canonicalKey = normalizeKeyword(cleanTitle || item.title);

    // Filter duplicate releases of the same title
    if (seenCanonicalTitles.has(canonicalKey)) {
      continue;
    }
    seenCanonicalTitles.add(canonicalKey);

    result.push(mapCatalogItemToContentItem(item, collection, metrics));
  }

  return result;
}

/**
 * Maps a genuine MovieBox catalog item into CineVault's ContentItem format.
 */
export function mapCatalogItemToContentItem(
  it: MovieBoxCatalogItem,
  collection?: CollectionDefinition,
  metrics?: Record<string, BrowseMetrics>
): ContentItem {
  const rawId = it.id.value;
  const isSeries = it.media_type === 'series';
  const cleanTitle = getCanonicalTitle(it.title);
  const titleLower = it.title.toLowerCase();
  const hasHindi = titleLower.includes('hindi');
  const hasEnglishDub = titleLower.includes('dub') || titleLower.includes('english');

  // Extract genuine rating from metrics if available
  const metricRating = metrics?.[rawId]?.rating;
  const validRating =
    typeof metricRating === 'number' && !isNaN(metricRating) && metricRating > 0
      ? metricRating
      : undefined;

  const genres = collection?.genres?.map((g, idx) => ({
    id: `g-${idx}`,
    name: g,
    slug: normalizeKeyword(g).replace(/\s+/g, '-'),
  })) || [{ id: 'g-collection', name: collection?.name || 'Curated', slug: 'curated' }];

  return {
    id: `mb-${rawId}`,
    externalId: rawId,
    title: cleanTitle || it.title,
    slug: `mb-${rawId}`,
    contentType: isSeries ? 'tv' : 'movie',
    posterUrl: it.poster_url || '/images/neutral-poster.svg',
    backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
    description: `${cleanTitle || it.title} (${it.year || 'Collection Title'})`,
    releaseDate: it.year ? `${it.year}-01-01` : '',
    year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
    rating: validRating,
    genres,
    language: hasHindi ? 'Multi-Dub' : hasEnglishDub ? 'English Dubbed' : 'Original',
    status: 'released',
    availableAudio: hasHindi ? ['Original Audio', 'Hindi (Dub)'] : ['English / Original'],
    availableSubtitles: ['English'],
  };
}

// ================= DISCOVERY CACHE & MULTI-QUERY ENGINE =================

interface CachedCollectionDiscovery {
  items: ContentItem[];
  timestamp: number;
}

const discoveryCache = new Map<string, CachedCollectionDiscovery>();
const DISCOVERY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

/**
 * Concurrency helper to run async tasks in batches of `limit`.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit).map(fn => fn());
    const batchResults = await Promise.allSettled(batch);
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      }
    }
  }
  return results;
}

/**
 * Actively discovers, aggregates, and caches genuine content for a collection
 * using multiple search queries across pages, plus the primary tab feed.
 */
export async function discoverCollectionContent(
  collection: CollectionDefinition,
  options?: { forceRefresh?: boolean; maxTargetItems?: number }
): Promise<ContentItem[]> {
  const now = Date.now();
  const cached = discoveryCache.get(collection.slug);

  if (!options?.forceRefresh && cached && now - cached.timestamp < DISCOVERY_CACHE_TTL_MS) {
    return cached.items;
  }

  const rawItems: MovieBoxCatalogItem[] = [];
  const metrics: Record<string, BrowseMetrics> = {};
  const seenIds = new Set<string>();

  const ingestItems = (items?: MovieBoxCatalogItem[], itemMetrics?: Record<string, BrowseMetrics>) => {
    if (!items) return;
    for (const it of items) {
      if (it?.id?.value && !seenIds.has(it.id.value)) {
        seenIds.add(it.id.value);
        rawItems.push(it);
      }
    }
    if (itemMetrics) {
      Object.assign(metrics, itemMetrics);
    }
  };

  // 1. Fetch primary provider tab feed (pages 1 and 2)
  const targetTab = collection.providerTab || 'all';
  try {
    const [tabP1, tabP2] = await Promise.allSettled([
      movieboxApi.homepage(targetTab, 1),
      movieboxApi.homepage(targetTab, 2),
    ]);
    if (tabP1.status === 'fulfilled') ingestItems(tabP1.value?.items, tabP1.value?.metrics);
    if (tabP2.status === 'fulfilled') ingestItems(tabP2.value?.items, tabP2.value?.metrics);
  } catch (err) {
    console.warn(`[Discovery] Tab fetch error for ${collection.slug}:`, err);
  }

  // 2. Build task list for search queries (pages 1 and 2 per query)
  const searchQueries = collection.searchQueries || [];
  const selectedQueries = searchQueries.slice(0, 8); // Top 8 high-yield queries

  const searchTasks: (() => Promise<MovieBoxCatalogItem[]>)[] = [];

  for (const q of selectedQueries) {
    // Page 1 task
    searchTasks.push(() =>
      movieboxApi.search(q, 'moviebox', 1).catch(() => [])
    );
    // Page 2 task
    searchTasks.push(() =>
      movieboxApi.search(q, 'moviebox', 2).catch(() => [])
    );
  }

  // Execute with bounded concurrency (3 parallel requests at a time)
  const searchBatchResults = await runWithConcurrency(searchTasks, 3);
  for (const items of searchBatchResults) {
    ingestItems(items);
  }

  // 3. Score, deduplicate, and convert
  const matchedContent = getCollectionItems(collection, rawItems, metrics);

  // 4. Save to cache
  discoveryCache.set(collection.slug, {
    items: matchedContent,
    timestamp: now,
  });

  return matchedContent;
}

/**
 * Access cached items for collection if available without re-triggering discovery.
 */
export function getCachedCollectionContent(slug: string): ContentItem[] | null {
  const cached = discoveryCache.get(slug);
  if (cached && Date.now() - cached.timestamp < DISCOVERY_CACHE_TTL_MS) {
    return cached.items;
  }
  return null;
}
