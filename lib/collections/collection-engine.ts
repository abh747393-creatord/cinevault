import { MovieBoxCatalogItem, BrowseMetrics } from '@/lib/api/moviebox-client';
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

  // 1. Safety check
  const isAdultAllowed = collection.slug.includes('adult') || collection.slug.includes('midnight');
  if (!isLegitimateTitle(item.title, item.year, isAdultAllowed)) {
    return 0;
  }

  // 2. Media type compatibility
  if (collection.mediaType === 'movie' && item.media_type === 'series') {
    return 0;
  }
  if (collection.mediaType === 'series' && item.media_type === 'movie') {
    return 0;
  }

  let score = 0;
  const titleNorm = normalizeKeyword(item.title);
  const rawTitleLower = item.title.toLowerCase();
  const descNorm = additionalMetadata?.description ? normalizeKeyword(additionalMetadata.description) : '';
  const itemGenres = additionalMetadata?.genres?.map(g => normalizeKeyword(g)) || [];
  const itemLang = additionalMetadata?.language ? normalizeKeyword(additionalMetadata.language) : '';

  // 3. Provider Category / Tab Alignment
  if (collection.providerTab) {
    if (collection.providerTab === 'movie' && item.media_type === 'movie') score += 2;
    if (collection.providerTab === 'tv' && item.media_type === 'series') score += 2;
  }

  // 4. Language & Audio Hints Check (Crucial for K-Drama, C-Drama, Anime English Dubbed, Hindi)
  if (collection.languageHints && collection.languageHints.length > 0) {
    for (const hint of collection.languageHints) {
      const normHint = normalizeKeyword(hint);
      // Check in title tags like [Hindi], [Dubbed], [English Dub]
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
      // Check in item genres
      if (itemGenres.some(g => g.includes(normColGenre) || normColGenre.includes(g))) {
        score += 10;
      }
      // Check in description
      if (descNorm && containsKeyword(descNorm, normColGenre)) {
        score += 4;
      }
      // Check in title
      if (containsKeyword(titleNorm, normColGenre)) {
        score += 5;
      }
    }
  }

  // 6. Keywords Matching (Primary search tokens)
  const keywords = collection.keywords || collection.searchQueries || [];
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

  // 7. Title Hints (For iconic franchises like "Iron Man", "Avengers", "Batman", "Harry Potter")
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
      return 0; // Did not satisfy mandatory keyword requirement
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
