/**
 * CineVault Content Filter & Deduplication Engine
 * Ensures 100% authentic franchise titles, strips duplicates,
 * and completely eliminates adult/explicit content, mockbusters, and promotional filler.
 */

// Strict Adult / Inappropriate / B-grade title blacklist
const ADULT_AND_EXPLICIT_KEYWORDS = [
  'dirty',
  'doctor dirty',
  'sexy',
  'hot bhabhi',
  'erotic',
  'erotica',
  'ullu',
  'kooku',
  'xtramood',
  'prami',
  'unrated uncut',
  'nude',
  'nudity',
  'lust',
  'scandal',
  'bhabhi',
  'deshi',
  'adult film',
  'chudai',
  'desi porn',
  'hot clip',
  'sex',
  'strip',
  'kamini',
  'charmsukh',
  'palang tod',
  'kavita bhabhi',
  'tandoor',
  'mastram',
  'jalebi bai',
  // Adult & erotic themes
  'hidden desire',
  'hidden desires',
  'desire',
  'desires',
  'glory hole',
  'the glory hole',
  'flower and snake',
  'sensual',
  'infidelity',
  'seduce',
  'seduction',
  'pleasure',
  'taboo',
  'passion',
  'provocative',
  'forbidden',
  'wild nights',
  'bedroom',
  'temptation',
  'lettomania',
  'hentai',
  'ecchi',
  'soushisouai',
  'incest',
  'adult clip',
  'hot movie',
  'uncut 18+',
  '18+ uncut',
  'hot romance',
  'sensuous',
  'intimate encounters',
  'pleasure room',
  'dirty doctor',
  'porn',
];

// Mockbuster / Known Fake Franchise Titles / Promos
const MOCKBUSTER_AND_FILLER_BLACKLIST = [
  'thor: god of thunder', // The Asylum mockbuster
  'avengers: doom of the world', // Fan film
  'avengers (2025)', // B-movie
  'avengers: secret wars (2027)', // Unreleased trailer/placeholder
  'spider-man: brand new day', // Fan concept
  'the asylum',
  'making of',
  'unmasked',
  'behind the scenes',
  'press conference',
  'teaser trailer',
  'financial & entertainment',
  'special feature',
  'stepping up', // bonus featurette
  'quachita beast',
  'area 51 incident',
  'incident in a ghostland',
  'incident of the coastland',
];

/**
 * Strips bracket tags and season tags for display.
 * e.g., "Deadpool & Wolverine [Hindi]" -> "Deadpool & Wolverine"
 * e.g., "Loki [Hindi] S2 (2023)" -> "Loki"
 */
export function getCanonicalTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\[.*?\]/g, '') // remove [Hindi], [English], etc.
    .replace(/\(.*?\)/g, '') // remove (2024), etc.
    .replace(/s\d+(-\s*s\d+)?/gi, '') // remove S1-S2, S1, etc.
    .replace(/season\s*\d+/gi, '') // remove Season 1, etc.
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes title for strict comparison by stripping all punctuation and spaces.
 * e.g., "Iron Man 2" -> "ironman2"
 * e.g., "Spider-Man: No Way Home" -> "spidermannowayhome"
 * e.g., "Loki 7" -> "loki7" (will NOT match "loki"!)
 */
export function normalizeTitleForMatching(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/s\d+(-\s*s\d+)?/gi, '')
    .replace(/season\s*\d+/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Checks if a title is safe and legitimate.
 */
export function isLegitimateTitle(
  rawTitle: string,
  year?: string | number,
  allowAdultCollection = false
): boolean {
  if (!rawTitle) return false;
  const titleLower = rawTitle.toLowerCase();

  // 1. Adult filter (unless it's American Pie 18+)
  if (!allowAdultCollection) {
    for (const word of ADULT_AND_EXPLICIT_KEYWORDS) {
      if (titleLower.includes(word)) {
        return false;
      }
    }
  }

  // 2. Mockbuster & Fake concepts / promo filler filter
  for (const fake of MOCKBUSTER_AND_FILLER_BLACKLIST) {
    if (titleLower.includes(fake)) {
      return false;
    }
  }

  // 3. Year Sanity Check (filter out unreleased fake concept trailers > 2030 or invalid years)
  if (year) {
    const y = typeof year === 'number' ? year : parseInt(year, 10);
    if (!isNaN(y)) {
      if (y > 2030 || y < 1900) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Strict canonical matching against curated titles.
 * Uses exact alphanumeric equality so "Loki 7" NEVER matches "Loki",
 * and "Thor: The Dark World Special" NEVER matches "Thor: The Dark World".
 */
export function matchesCuratedTitle(
  itemTitle: string,
  curatedTitle: string
): boolean {
  const normItem = normalizeTitleForMatching(itemTitle);
  const normCurated = normalizeTitleForMatching(curatedTitle);
  return normItem === normCurated;
}

/**
 * Filter and deduplicate a list of items based on canonical title.
 */
export function deduplicateAndCleanCatalog<
  T extends {
    title: string;
    year?: string | number;
    id: { value: string };
    poster_url?: string;
  }
>(
  items: T[],
  options?: {
    allowAdultCollection?: boolean;
    curatedTitles?: string[];
    requiredKeyword?: string;
    requiredKeywords?: string[];
  }
): T[] {
  const seenCanonical = new Map<string, T>();
  const isAdultAllowed = options?.allowAdultCollection ?? false;
  const curated = options?.curatedTitles;
  const required = options?.requiredKeyword?.toLowerCase();
  const requiredList = options?.requiredKeywords?.map((k) => k.toLowerCase().trim());

  // Pre-normalize curated set for O(1) exact matching
  const curatedNormalizedSet = curated && curated.length > 0
    ? new Set(curated.map(normalizeTitleForMatching))
    : null;

  for (const item of items) {
    if (!item || !item.title) continue;

    // Safety & legitimacy check
    if (!isLegitimateTitle(item.title, item.year, isAdultAllowed)) {
      continue;
    }

    const titleLower = item.title.toLowerCase();

    // Required single keyword check if specified
    if (required && !titleLower.includes(required)) {
      continue;
    }

    // Required multiple keywords check if specified (must contain at least one)
    if (requiredList && requiredList.length > 0) {
      const matchesAny = requiredList.some((kw) => titleLower.includes(kw));
      if (!matchesAny) {
        continue;
      }
    }

    const normItem = normalizeTitleForMatching(item.title);

    // If curated titles are specified, ensure exact normalized match
    if (curatedNormalizedSet) {
      if (!curatedNormalizedSet.has(normItem)) {
        continue;
      }
    }

    const canonical = getCanonicalTitle(item.title).toLowerCase();

    // Deduplicate: if we haven't seen this canonical title yet, add it.
    if (!seenCanonical.has(canonical)) {
      seenCanonical.set(canonical, item);
    } else {
      // If the new one has a cleaner title (no brackets) or higher resolution, replace
      const existing = seenCanonical.get(canonical)!;
      const existingHasBrackets = /\[.*?\]/.test(existing.title);
      const newHasBrackets = /\[.*?\]/.test(item.title);
      if (existingHasBrackets && !newHasBrackets) {
        seenCanonical.set(canonical, item);
      }
    }
  }

  return Array.from(seenCanonical.values());
}
