import { ContentProvider } from './provider-interface';
import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';
import { slugify } from '@/lib/utils';

export class TmdbAdapter implements ContentProvider {
  id = 'provider-tmdb-metadata';
  name = 'The Movie Database (TMDB) Adapter';
  slug = 'tmdb';
  priority = 2;

  get enabled(): boolean {
    return Boolean(process.env.TMDB_API_KEY);
  }

  getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      enabled: this.enabled,
      priority: this.priority,
      status: this.enabled ? 'active' : 'disabled',
      lastChecked: new Date().toISOString(),
      errorCount: 0,
    };
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    if (!this.enabled) return [];
    try {
      const apiKey = process.env.TMDB_API_KEY;
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.results || [])
        .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
        .map((r: any) => ({
          id: `tmdb-${r.id}`,
          providerId: this.id,
          title: r.title || r.name,
          year: r.release_date ? parseInt(r.release_date.slice(0, 4)) : undefined,
          contentType: r.media_type === 'movie' ? 'movie' : 'tv',
          posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
          overview: r.overview,
        }));
    } catch {
      return [];
    }
  }

  async getMovie(idOrSlug: string): Promise<ContentItem | null> {
    if (!this.enabled) return null;
    try {
      const apiKey = process.env.TMDB_API_KEY;
      const tmdbId = idOrSlug.replace('tmdb-', '');
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`, {
        next: { revalidate: 86400 },
      });
      if (!res.ok) return null;
      const m = await res.json();

      return {
        id: `tmdb-${m.id}`,
        externalId: String(m.id),
        contentType: 'movie',
        title: m.title,
        originalTitle: m.original_title,
        slug: slugify(m.title) + `-${m.id}`,
        description: m.overview,
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
        backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
        releaseDate: m.release_date,
        year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : 2024,
        runtime: m.runtime,
        rating: Math.round(m.vote_average * 10) / 10,
        language: m.original_language,
        country: m.production_countries?.[0]?.name,
        status: 'released',
        genres: (m.genres || []).map((g: any) => ({ id: `g-${g.id}`, name: g.name, slug: slugify(g.name) })),
      };
    } catch {
      return null;
    }
  }

  async getTvShow(idOrSlug: string): Promise<ContentItem | null> {
    if (!this.enabled) return null;
    try {
      const apiKey = process.env.TMDB_API_KEY;
      const tmdbId = idOrSlug.replace('tmdb-', '');
      const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`, {
        next: { revalidate: 86400 },
      });
      if (!res.ok) return null;
      const t = await res.json();

      return {
        id: `tmdb-${t.id}`,
        externalId: String(t.id),
        contentType: 'tv',
        title: t.name,
        originalTitle: t.original_name,
        slug: slugify(t.name) + `-${t.id}`,
        description: t.overview,
        posterUrl: t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : '',
        backdropUrl: t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : '',
        releaseDate: t.first_air_date,
        year: t.first_air_date ? parseInt(t.first_air_date.slice(0, 4)) : 2024,
        rating: Math.round(t.vote_average * 10) / 10,
        language: t.original_language,
        country: t.origin_country?.[0],
        status: 'released',
        genres: (t.genres || []).map((g: any) => ({ id: `g-${g.id}`, name: g.name, slug: slugify(g.name) })),
      };
    } catch {
      return null;
    }
  }

  async getEpisodes(contentId: string, seasonNumber: number = 1): Promise<Episode[]> {
    if (!this.enabled) return [];
    try {
      const apiKey = process.env.TMDB_API_KEY;
      const tmdbId = contentId.replace('tmdb-', '');
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}`,
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) return [];
      const s = await res.json();
      return (s.episodes || []).map((e: any) => ({
        id: `tmdb-ep-${e.id}`,
        seasonId: `tmdb-s-${seasonNumber}`,
        episodeNumber: e.episode_number,
        title: e.name,
        description: e.overview,
        thumbnailUrl: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : '',
        runtime: e.runtime || 45,
        releaseDate: e.air_date,
      }));
    } catch {
      return [];
    }
  }

  async getStreams(_contentId: string, _episodeId?: string): Promise<StreamSource[]> {
    // TMDB provides metadata only, no raw streams.
    // Falls back to provider chain.
    return [];
  }
}
