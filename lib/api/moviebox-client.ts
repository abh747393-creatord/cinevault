export const RUST_API_BASE = (
  process.env.NEXT_PUBLIC_RUST_API_URL ||
  process.env.RUST_API_URL ||
  process.env.NEXT_PUBLIC_MOVIEBOX_API_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export const MOVIEBOX_API_BASE = `${RUST_API_BASE}/api/v1`;

export interface MovieBoxCatalogItem {
  id: {
    provider: string;
    value: string;
  };
  title: string;
  media_type: 'movie' | 'series';
  year?: string;
  poster_url?: string;
  season_count?: number;
}

export interface MovieBoxEpisode {
  season: number;
  number: number;
  title?: string;
}

export interface MovieBoxSeason {
  number: number;
  episodes: MovieBoxEpisode[];
}

export interface MovieBoxAudioTrackOption {
  subject_id: string;
  language: string;
  label: string;
}

export interface MovieBoxMediaDetails {
  id: {
    provider: string;
    value: string;
  };
  title: string;
  media_type: 'movie' | 'series';
  year?: string;
  description?: string;
  tagline?: string;
  imdb_rating?: string;
  director?: string;
  stars?: string;
  prints?: string;
  audios?: string;
  poster_url?: string;
  duration?: string;
  genres: string[];
  seasons: MovieBoxSeason[];
  dubs: MovieBoxAudioTrackOption[];
}

export interface MovieBoxMirror {
  label: string;
  resolver_url: string;
  proxy_url: string;
  direct_file: boolean;
}

export interface MovieBoxRelease {
  provider: string;
  filename: string;
  quality?: string;
  codec?: string;
  language?: string;
  size_bytes?: number;
  season?: number;
  episode?: number;
  mirrors: MovieBoxMirror[];
  resource_id?: string;
}

export interface MovieBoxSubtitle {
  name: string;
  url: string;
  proxy_url: string;
}

export interface BrowseMetrics {
  trending?: number;
  rating?: number;
  recent_rating?: number;
  popularity?: number;
}

export interface HomepageResponse {
  items: MovieBoxCatalogItem[];
  metrics: Record<string, BrowseMetrics>;
}

const apiCache = new Map<string, { data: any; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlSeconds: number = 600): void {
  apiCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export class MovieBoxApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = MOVIEBOX_API_BASE) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async health(): Promise<{ status: string; version: string; providers: string[] }> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/health`, { cache: 'no-store' }, 4000);
      if (res.ok) {
        const data = await res.json();
        return {
          status: data.status || 'ok',
          version: data.version || '0.1.18',
          providers: data.providers || ['moviebox', 'fourkhdhub', 'circleftp', 'dhakaflix', 'addons'],
        };
      }
    } catch {}
    try {
      const res = await fetchWithTimeout(`${RUST_API_BASE}/health`, { cache: 'no-store' }, 4000);
      if (res.ok) {
        const data = await res.json();
        return {
          status: data.status || 'healthy',
          version: data.version || '0.1.18',
          providers: ['moviebox', 'fourkhdhub', 'circleftp', 'dhakaflix', 'addons'],
        };
      }
    } catch {}
    throw new Error('Health check failed');
  }

  async suggest(query: string): Promise<string[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const cacheKey = `suggest:${q}`;
    const cached = getCached<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/suggest?q=${encodeURIComponent(q)}`, {}, 5000);
      if (!res.ok) return [];
      const data: string[] = await res.json();
      setCached(cacheKey, data || [], 300);
      return data || [];
    } catch {
      return [];
    }
  }

  async search(query: string, provider: string = 'moviebox', page: number = 1): Promise<MovieBoxCatalogItem[]> {
    const q = query.trim();
    if (!q) return [];
    const cacheKey = `search:${provider}:${page}:${q.toLowerCase()}`;
    const cached = getCached<MovieBoxCatalogItem[]>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(`${this.baseUrl}/search?q=${encodeURIComponent(q)}&provider=${encodeURIComponent(provider)}&page=${page}`, {}, 7000);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data: MovieBoxCatalogItem[] = await res.json();
    setCached(cacheKey, data || [], 180);
    return data;
  }

  async homepage(tab: string = 'all', page: number = 1): Promise<HomepageResponse> {
    const cacheKey = `homepage:${tab}:${page}`;
    const cached = getCached<HomepageResponse>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(`${this.baseUrl}/homepage?tab=${encodeURIComponent(tab)}&page=${page}`, {}, 8000);
    if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`);
    const data: HomepageResponse = await res.json();
    setCached(cacheKey, data, 600); // 10 minutes cache
    return data;
  }

  async details(id: string, provider: string = 'moviebox'): Promise<MovieBoxMediaDetails> {
    const cacheKey = `details:${provider}:${id}`;
    const cached = getCached<MovieBoxMediaDetails>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(`${this.baseUrl}/details/${encodeURIComponent(id)}?provider=${encodeURIComponent(provider)}`, {}, 8000);
    if (!res.ok) throw new Error(`Details fetch failed: ${res.status}`);
    const data: MovieBoxMediaDetails = await res.json();
    setCached(cacheKey, data, 1800); // 30 minutes cache
    return data;
  }

  async streams(id: string, provider: string = 'moviebox', season: number = 0, episode: number = 0): Promise<MovieBoxRelease[]> {
    const res = await fetchWithTimeout(`${this.baseUrl}/streams/${encodeURIComponent(id)}?provider=${encodeURIComponent(provider)}&season=${season}&episode=${episode}`, {}, 8000);
    if (!res.ok) throw new Error(`Streams fetch failed: ${res.status}`);
    return res.json();
  }

  async subtitles(subjectId: string, resourceId: string = ''): Promise<MovieBoxSubtitle[]> {
    const res = await fetchWithTimeout(`${this.baseUrl}/subtitles/${encodeURIComponent(subjectId)}?resource_id=${encodeURIComponent(resourceId)}`, {}, 6000);
    if (!res.ok) return [];
    return res.json();
  }
}

export const movieboxApi = new MovieBoxApiClient();
