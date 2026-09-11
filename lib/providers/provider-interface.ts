import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';

export interface ContentProvider {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  priority: number;

  getMetadata(): ProviderMetadata;

  search(query: string): Promise<ProviderSearchResult[]>;

  getMovie(idOrSlug: string): Promise<ContentItem | null>;

  getTvShow(idOrSlug: string): Promise<ContentItem | null>;

  getEpisodes(contentId: string, seasonNumber?: number): Promise<Episode[]>;

  getStreams(contentId: string, episodeId?: string): Promise<StreamSource[]>;
}
