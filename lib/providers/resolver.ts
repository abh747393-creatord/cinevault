import { ContentProvider } from './provider-interface';
import { MovieBoxProvider } from './moviebox-provider';
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
      new MovieBoxProvider(),
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
    // Final fallback: Seed database (matching by ID, slug, stripped prefix, or externalId)
    const cleanId = idOrSlug.replace(/^mb-/, '');
    return SEED_CONTENT.find((c) => {
      const cCleanId = c.id.replace(/^mb-/, '');
      const cExtId = c.externalId?.replace(/^mb-/, '');
      return (
        c.id === idOrSlug ||
        c.slug === idOrSlug ||
        cCleanId === cleanId ||
        (cExtId && cExtId === cleanId)
      ) && c.contentType === 'movie';
    }) || null;
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
    // Final fallback: Seed database (matching by ID, slug, stripped prefix, or externalId)
    const cleanId = idOrSlug.replace(/^mb-/, '');
    return SEED_CONTENT.find((c) => {
      const cCleanId = c.id.replace(/^mb-/, '');
      const cExtId = c.externalId?.replace(/^mb-/, '');
      return (
        c.id === idOrSlug ||
        c.slug === idOrSlug ||
        cCleanId === cleanId ||
        (cExtId && cExtId === cleanId)
      ) && (c.contentType === 'tv' || c.contentType === 'anime');
    }) || null;
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
    const cleanId = contentId.replace(/^mb-/, '');
    const show = SEED_CONTENT.find((c) => {
      const cCleanId = c.id.replace(/^mb-/, '');
      const cExtId = c.externalId?.replace(/^mb-/, '');
      return (
        c.id === contentId ||
        c.slug === contentId ||
        cCleanId === cleanId ||
        (cExtId && cExtId === cleanId)
      );
    });
    const season = show?.seasons?.find((s) => s.seasonNumber === seasonNumber) || show?.seasons?.[0];
    return season?.episodes || [];
  }

  async resolveStreams(contentId: string, episodeId?: string, dubId?: string): Promise<StreamSource[]> {
    for (const provider of this.providers) {
      if (!provider.enabled) continue;
      try {
        const streams = await provider.getStreams(contentId, episodeId, dubId);
        const validStreams = (streams || []).filter(
          (s) => Boolean(s?.url && typeof s.url === 'string' && s.url.trim().length > 0)
        );
        if (validStreams.length > 0) return validStreams;
      } catch (err) {
        console.warn(`[Provider ${provider.slug}] getStreams failed:`, err);
      }
    }
    return [];
  }

  async globalSearch(query: string): Promise<ProviderSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const enabledProviders = this.providers
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Parallel provider search with per-provider timeout (3500ms)
    const searchPromises = enabledProviders.map(async (provider) => {
      try {
        const timeoutPromise = new Promise<ProviderSearchResult[]>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on ${provider.slug}`)), 3500)
        );
        const list = await Promise.race([provider.search(q), timeoutPromise]);
        return { provider, list: list || [] };
      } catch (err) {
        console.warn(`[ProviderResolver] Provider search error for ${provider.name}:`, err);
        return { provider, list: [] };
      }
    });

    const settled = await Promise.allSettled(searchPromises);

    const results: ProviderSearchResult[] = [];
    const seenKeys = new Set<string>();

    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value.list.length > 0) {
        for (const res of item.value.list) {
          // Normalize key for deduplication: title + release year
          const normalizedTitle = res.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          const dedupeKey = res.year ? `${normalizedTitle}:${res.year}` : normalizedTitle;

          if (!seenKeys.has(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.push(res);
          }
        }
      }
    }

    return results;
  }
}

export const providerResolver = new ProviderResolver();
