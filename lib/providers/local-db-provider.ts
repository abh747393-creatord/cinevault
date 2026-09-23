import { ContentProvider } from './provider-interface';
import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export class LocalDbProvider implements ContentProvider {
  id = 'provider-local-db';
  name = 'Supabase PostgreSQL Catalog';
  slug = 'supabase-catalog';
  enabled = true;
  priority = 0; // Highest priority if configured

  getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      enabled: this.enabled,
      priority: this.priority,
      status: isSupabaseConfigured ? 'active' : 'degraded',
      lastChecked: new Date().toISOString(),
      errorCount: 0,
    };
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const supabase = getBrowserClient();
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('content')
        .select('id, title, year, content_type, poster_url, description')
        .ilike('title', `%${query}%`)
        .limit(20);

      if (error || !data) return [];
      return data.map((item: any) => ({
        id: item.id,
        providerId: this.id,
        title: item.title,
        year: item.year,
        contentType: item.content_type,
        posterUrl: item.poster_url,
        overview: item.description,
      }));
    } catch {
      return [];
    }
  }

  async getMovie(idOrSlug: string): Promise<ContentItem | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const supabase = getBrowserClient();
      if (!supabase) return null;
      const query = supabase.from('content').select('*, genres(*)').eq('content_type', 'movie');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const { data, error } = await (isUUID ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug)).single();

      if (error || !data) return null;
      return this.mapRowToContentItem(data);
    } catch {
      return null;
    }
  }

  async getTvShow(idOrSlug: string): Promise<ContentItem | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const supabase = getBrowserClient();
      if (!supabase) return null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = supabase
        .from('content')
        .select('*, genres(*), seasons(*, episodes(*))')
        .in('content_type', ['tv', 'anime']);
      const { data, error } = await (isUUID ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug)).single();

      if (error || !data) return null;
      return this.mapRowToContentItem(data);
    } catch {
      return null;
    }
  }

  async getEpisodes(contentId: string, seasonNumber: number = 1): Promise<Episode[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const supabase = getBrowserClient();
      if (!supabase) return [];
      const { data: season } = await supabase
        .from('seasons')
        .select('id, episodes(*)')
        .eq('content_id', contentId)
        .eq('season_number', seasonNumber)
        .single();

      return (season?.episodes || []).map((ep: any) => ({
        id: ep.id,
        seasonId: ep.season_id,
        episodeNumber: ep.episode_number,
        title: ep.title,
        description: ep.description,
        thumbnailUrl: ep.thumbnail_url,
        runtime: ep.runtime,
        releaseDate: ep.release_date,
        streamUrl: ep.stream_url,
      }));
    } catch {
      return [];
    }
  }

  async getStreams(contentId: string, episodeId?: string): Promise<StreamSource[]> {
    if (!isSupabaseConfigured || contentId.startsWith('mb-')) {
      return [];
    }

    try {
      const supabase = getBrowserClient();
      if (!supabase) return [];
      let query = supabase.from('content_sources').select('*').eq('content_id', contentId);
      if (episodeId) {
        query = query.eq('episode_id', episodeId);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return [];

      return data.map((src: any) => ({
        id: src.id,
        url: src.stream_url,
        quality: src.quality || '1080p',
        format: src.source_type || 'mp4',
        providerId: this.id,
        providerName: this.name,
      }));
    } catch {
      return [];
    }
  }

  private mapRowToContentItem(row: any): ContentItem {
    return {
      id: row.id,
      externalId: row.external_id,
      contentType: row.content_type,
      title: row.title,
      originalTitle: row.original_title,
      slug: row.slug,
      description: row.description,
      posterUrl: row.poster_url,
      backdropUrl: row.backdrop_url,
      releaseDate: row.release_date,
      year: row.year,
      runtime: row.runtime,
      rating: Number(row.rating) || 0,
      ageRating: row.age_rating,
      language: row.language,
      country: row.country,
      status: row.status,
      featured: row.featured,
      director: row.director,
      cast: row.cast_list || [],
      quality: row.quality || '1080p',
      genres: row.genres || [],
    };
  }
}
