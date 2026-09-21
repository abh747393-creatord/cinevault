import { ContentProvider } from './provider-interface';
import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';

export class OpenSourceProvider implements ContentProvider {
  id = 'provider-open-cinema';
  name = 'Open Cinema & Public Domain Archive';
  slug = 'open-cinema';
  enabled = false;
  priority = 99;

  getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      enabled: this.enabled,
      priority: this.priority,
      status: 'disabled',
      lastChecked: new Date().toISOString(),
      errorCount: 0,
    };
  }

  async search(_query: string): Promise<ProviderSearchResult[]> {
    return [];
  }

  async getMovie(_idOrSlug: string): Promise<ContentItem | null> {
    return null;
  }

  async getTvShow(_idOrSlug: string): Promise<ContentItem | null> {
    return null;
  }

  async getEpisodes(_contentId: string, _seasonNumber: number = 1): Promise<Episode[]> {
    return [];
  }

  async getStreams(_contentId: string, _episodeId?: string): Promise<StreamSource[]> {
    return [];
  }
}
