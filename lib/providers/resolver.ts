import { ContentProvider } from './provider-interface';
import { LocalDbProvider } from './local-db-provider';
import { OpenSourceProvider } from './open-source-provider';
import { TmdbAdapter } from './tmdb-adapter';
import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';

class ProviderResolver {
  private providers: ContentProvider[] = [];

  constructor() {
    this.providers = [
      new LocalDbProvider(),
      new OpenSourceProvider(),
      new TmdbAdapter(),
    ].sort((a, b) => a.priority - b.priority);
  }

  getProviders(): ContentProvider[] {
    return this.providers;
  }

  getProvidersMetadata(): ProviderMetadata[] {
    return this.providers.map((p) => p.getMetadata());
  }

  async resolveMovie(idOrSlug: string): Promise<ContentItem | null> {
    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const item = await provider.getMovie(idOrSlug);
        if (item) return item;
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] getMovie failed:`, err);
      }
    }
    // Final fallback: Seed database
    return SEED_CONTENT.find((c) => (c.id === idOrSlug || c.slug === idOrSlug) && c.contentType === 'movie') || null;
  }

  async resolveTvShow(idOrSlug: string): Promise<ContentItem | null> {
    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const item = await provider.getTvShow(idOrSlug);
        if (item) return item;
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] getTvShow failed:`, err);
      }
    }
    return SEED_CONTENT.find((c) => (c.id === idOrSlug || c.slug === idOrSlug) && (c.contentType === 'tv' || c.contentType === 'anime')) || null;
  }

  async resolveEpisodes(contentId: string, seasonNumber: number = 1): Promise<Episode[]> {
    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const episodes = await provider.getEpisodes(contentId, seasonNumber);
        if (episodes && episodes.length > 0) return episodes;
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] getEpisodes failed:`, err);
      }
    }
    const show = SEED_CONTENT.find((c) => c.id === contentId || c.slug === contentId);
    const season = show?.seasons?.find((s) => s.seasonNumber === seasonNumber) || show?.seasons?.[0];
    return season?.episodes || [];
  }

  async resolveStreams(contentId: string, episodeId?: string): Promise<StreamSource[]> {
    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const streams = await provider.getStreams(contentId, episodeId);
        if (streams && streams.length > 0) return streams;
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] getStreams failed:`, err);
      }
    }
    return [];
  }

  async globalSearch(query: string): Promise<ProviderSearchResult[]> {
    const results: ProviderSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const list = await provider.search(query);
        for (const item of list) {
          if (!seenIds.has(item.title.toLowerCase())) {
            seenIds.add(item.title.toLowerCase());
            results.push(item);
          }
        }
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] search failed:`, err);
      }
    }
    return results;
  }
}

export const providerResolver = new ProviderResolver();
