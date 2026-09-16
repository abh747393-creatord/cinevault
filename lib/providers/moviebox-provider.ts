import { ContentProvider } from './provider-interface';
import { ContentItem, Episode, Season, Genre } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata, StreamQuality, AudioTrack } from '@/types/providers';
import { movieboxApi, MovieBoxMediaDetails, MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { slugify } from '@/lib/utils';
import { getEnrichedEpisode } from '@/lib/data/episode-metadata';
import { SAMPLE_SUBTITLES } from '@/lib/data/catalog-seed';

export class MovieBoxProvider implements ContentProvider {
  id = 'provider-sign-ultra-vip';
  name = 'Sign Ultra VIP Cinema';
  slug = 'sign-ultra-vip';
  enabled = true;
  priority = 0; // Highest priority

  getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      enabled: this.enabled,
      priority: this.priority,
      status: 'active',
      lastChecked: new Date().toISOString(),
      errorCount: 0,
    };
  }

  private extractSubjectId(idOrSlug: string): string {
    // Matches 'moviebox:12345', 'mb-12345', or slug ending with '-mb-12345'
    if (idOrSlug.startsWith('moviebox:')) {
      return idOrSlug.replace('moviebox:', '');
    }
    if (idOrSlug.startsWith('mb-')) {
      return idOrSlug.replace('mb-', '');
    }
    const slugMatch = idOrSlug.match(/mb-(\d+)/);
    if (slugMatch) {
      return slugMatch[1];
    }
    // If it's purely digits
    if (/^\d+$/.test(idOrSlug)) {
      return idOrSlug;
    }
    return idOrSlug;
  }

  private mapDetailsToContentItem(details: MovieBoxMediaDetails): ContentItem {
    const rawId = details.id?.value || '';
    const uniqueId = `mb-${rawId}`;
    const isSeries = details.media_type === 'series' || details.seasons.length > 0;
    const yearNum = details.year ? parseInt(details.year, 10) || 0 : 0;
    const ratingNum = details.imdb_rating ? parseFloat(details.imdb_rating) || 7.5 : 7.5;

    const genres: Genre[] = (details.genres || []).map((g) => ({
      id: slugify(g),
      name: g,
      slug: slugify(g),
    }));

    const seasons: Season[] = (details.seasons || []).map((s) => ({
      id: `s-${s.number}`,
      contentId: uniqueId,
      seasonNumber: s.number,
      title: `Season ${s.number}`,
      description: `Season ${s.number} of ${details.title}`,
      posterUrl: details.poster_url,
      episodes: (s.episodes || []).map((ep) => {
        const enriched = getEnrichedEpisode(rawId, s.number, ep.number);
        const dynamicRuntime =
          enriched?.runtime ||
          (details.duration ? parseInt(details.duration, 10) : undefined) ||
          (44 + ((ep.number * 7 + s.number * 3) % 21));
        return {
          id: `s${s.number}e${ep.number}`,
          seasonId: `s-${s.number}`,
          episodeNumber: ep.number,
          title: enriched?.title || ep.title || `Chapter ${ep.number}`,
          description:
            enriched?.description ||
            `Season ${s.number} Episode ${ep.number} of ${details.title}`,
          thumbnailUrl: details.poster_url || '',
          runtime: dynamicRuntime,
        };
      }),
    }));

    if (isSeries && seasons.length === 0) {
      seasons.push({
        id: 's-1',
        contentId: uniqueId,
        seasonNumber: 1,
        title: 'Season 1',
        description: `Season 1 of ${details.title}`,
        posterUrl: details.poster_url,
        episodes: [
          {
            id: 's1e1',
            seasonId: 's-1',
            episodeNumber: 1,
            title: 'Episode 1',
            description: `Episode 1 of ${details.title}`,
            thumbnailUrl: details.poster_url || '',
            runtime: details.duration ? parseInt(details.duration, 10) || 45 : 45,
          },
        ],
      });
    }

    return {
      id: uniqueId,
      externalId: rawId,
      contentType: isSeries ? 'tv' : 'movie',
      title: details.title,
      slug: `${slugify(details.title)}-mb-${rawId}`,
      description: details.description || details.tagline || 'No overview available.',
      posterUrl: details.poster_url || '',
      backdropUrl: details.poster_url || '',
      releaseDate: details.year ? `${details.year}-01-01` : '',
      year: yearNum,
      rating: ratingNum,
      ageRating: 'PG-13',
      language: 'English',
      status: isSeries ? 'ongoing' : 'released',
      genres,
      director: details.director,
      cast: details.stars ? details.stars.split(',').map((s) => s.trim()) : [],
      quality: '1080p',
      dubs: details.dubs || [],
      availableAudio: details.dubs && details.dubs.length > 0
        ? details.dubs.map((d) => d.label || d.language)
        : ['Original Audio'],
      seasons: isSeries ? seasons : undefined,
    };
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    try {
      const items = await movieboxApi.search(query);
      return items.map((item) => ({
        id: `mb-${item.id.value}`,
        providerId: this.id,
        title: item.title,
        year: item.year ? parseInt(item.year, 10) || undefined : undefined,
        contentType: item.media_type === 'series' ? 'tv' : 'movie',
        posterUrl: item.poster_url,
        overview: `${item.title} (${item.year || 'Unknown'})`,
      }));
    } catch (err) {
      console.warn('[MovieBoxProvider] Search error:', err);
      return [];
    }
  }

  async getMovie(idOrSlug: string): Promise<ContentItem | null> {
    let subjectId = this.extractSubjectId(idOrSlug);
    if (!/^\d+$/.test(subjectId)) {
      const cleanQuery = idOrSlug.replace(/^c-/, '').replace(/-\d{4}$/, '').replace(/-/g, ' ').trim();
      if (cleanQuery) {
        try {
          const results = await movieboxApi.search(cleanQuery);
          const match = results.find((r) => r.media_type !== 'series') || results[0];
          if (match) {
            subjectId = match.id.value;
          }
        } catch {}
      }
    }
    if (!/^\d+$/.test(subjectId)) return null;
    try {
      const details = await movieboxApi.details(subjectId);
      if (details.media_type === 'series') return null;
      return this.mapDetailsToContentItem(details);
    } catch {
      return null;
    }
  }

  async getTvShow(idOrSlug: string): Promise<ContentItem | null> {
    let subjectId = this.extractSubjectId(idOrSlug);
    if (!/^\d+$/.test(subjectId)) {
      const cleanQuery = idOrSlug.replace(/^c-/, '').replace(/-\d{4}$/, '').replace(/-/g, ' ').trim();
      if (cleanQuery) {
        try {
          const results = await movieboxApi.search(cleanQuery);
          const match = results.find((r) => r.media_type === 'series') || results[0];
          if (match) {
            subjectId = match.id.value;
          }
        } catch {}
      }
    }
    if (!/^\d+$/.test(subjectId)) return null;
    try {
      const details = await movieboxApi.details(subjectId);
      return this.mapDetailsToContentItem(details);
    } catch {
      return null;
    }
  }

  async getEpisodes(contentId: string, seasonNumber: number = 1): Promise<Episode[]> {
    const subjectId = this.extractSubjectId(contentId);
    if (!subjectId) return [];
    try {
      const details = await movieboxApi.details(subjectId);
      const targetSeason = details.seasons.find((s) => s.number === seasonNumber) || details.seasons[0];
      if (!targetSeason) return [];

      return (targetSeason.episodes || []).map((ep) => ({
        id: `s${targetSeason.number}e${ep.number}`,
        seasonId: `s-${targetSeason.number}`,
        episodeNumber: ep.number,
        title: ep.title || `Episode ${ep.number}`,
        description: `Season ${targetSeason.number} Episode ${ep.number}`,
        thumbnailUrl: details.poster_url || '',
        runtime: 45,
      }));
    } catch {
      return [];
    }
  }

  async getStreams(contentId: string, episodeId?: string, dubId?: string): Promise<StreamSource[]> {
    let mainSubjectId = this.extractSubjectId(contentId);
    let targetSubjectId = dubId ? this.extractSubjectId(dubId) : mainSubjectId;

    if (!/^\d+$/.test(targetSubjectId)) {
      const cleanQuery = contentId.replace(/^c-/, '').replace(/-\d{4}$/, '').replace(/-/g, ' ').trim();
      if (cleanQuery) {
        try {
          const results = await movieboxApi.search(cleanQuery);
          if (results && results.length > 0) {
            mainSubjectId = results[0].id.value;
            if (!dubId) {
              targetSubjectId = results[0].id.value;
            }
          }
        } catch {}
      }
    }
    if (!/^\d+$/.test(targetSubjectId)) return [];

    let season = 0;
    let episode = 0;
    if (episodeId) {
      const match = episodeId.match(/s(\d+)e(\d+)/i);
      if (match) {
        season = parseInt(match[1], 10);
        episode = parseInt(match[2], 10);
      }
    }

    try {
      // Also fetch details to discover available dub audio tracks
      let dubsList: { subject_id: string; language: string; label: string }[] = [];
      try {
        const details = await movieboxApi.details(mainSubjectId);
        if (details && details.dubs) {
          dubsList = details.dubs;
        }
      } catch {}

      const releases = await movieboxApi.streams(targetSubjectId, 'moviebox', season, episode);
      if (!releases || releases.length === 0) return [];

      const streamSources: StreamSource[] = [];
      let resourceId = '';

      const audioTracks: AudioTrack[] =
        dubsList.length > 0
          ? dubsList.map((d) => ({
              id: d.subject_id,
              language: d.language,
              label: d.label || d.language,
              isDefault: d.subject_id === targetSubjectId,
            }))
          : [{ id: targetSubjectId, language: 'en', label: 'Original Audio', isDefault: true }];

      // Find resourceId that strictly matches this season and episode
      for (const rel of releases) {
        if (season > 0 && episode > 0) {
          if (rel.season === season && rel.episode === episode && rel.resource_id) {
            resourceId = rel.resource_id;
            break;
          }
        } else if (rel.resource_id) {
          resourceId = rel.resource_id;
          break;
        }
      }

      for (const rel of releases) {
        for (const mirror of rel.mirrors) {
          let q: StreamQuality = '1080p';
          const lowerQ = (rel.quality || mirror.label).toLowerCase();
          if (lowerQ.includes('4k') || lowerQ.includes('2160')) q = '4K';
          else if (lowerQ.includes('720')) q = '720p';
          else if (lowerQ.includes('480')) q = '480p';
          else if (lowerQ.includes('360')) q = '360p';
          else if (lowerQ.includes('multi') || lowerQ.includes('auto')) q = 'auto';

          const isDash = mirror.proxy_url?.includes('.mpd') || mirror.proxy_url?.includes('/manifest.mpd');
          const cleanLabel = isDash ? 'Multi-Res' : (q || mirror.label);

          streamSources.push({
            id: `mb-stream-${rel.filename}-${mirror.label}`,
            url: mirror.proxy_url || mirror.resolver_url,
            quality: q,
            format: 'mp4',
            providerId: this.id,
            providerName: `CineVault CDN (${cleanLabel})`,
            bitrate: rel.size_bytes ? Math.round(rel.size_bytes / 3600) : undefined,
            audioTracks,
          });
        }
      }

      // Fetch external subtitles
      try {
        let subs: any[] = [];
        if (resourceId) {
          subs = await movieboxApi.subtitles(targetSubjectId, resourceId);
        }

        // If dub has no subtitles, check if main subject has matching episode subtitles
        if ((!subs || subs.length === 0) && mainSubjectId !== targetSubjectId) {
          try {
            const mainReleases = await movieboxApi.streams(mainSubjectId, 'moviebox', season, episode);
            const matchingMainRel = mainReleases.find(
              (r) => (season > 0 && episode > 0 ? r.season === season && r.episode === episode : true) && r.resource_id
            );
            if (matchingMainRel?.resource_id) {
              subs = await movieboxApi.subtitles(mainSubjectId, matchingMainRel.resource_id);
            }
          } catch {}
        }

        if (subs && subs.length > 0) {
          const subtitleTracks = subs.map((sub, idx) => ({
            id: `sub-${idx}-${slugify(sub.name)}`,
            language: sub.name,
            label: sub.name,
            src: sub.proxy_url || sub.url,
            kind: 'subtitles' as const,
            default: false,
          }));

          for (const s of streamSources) {
            s.subtitles = subtitleTracks;
          }
        } else {
          for (const s of streamSources) {
            s.subtitles = [];
          }
        }
      } catch (subErr) {
        console.warn('[MovieBoxProvider] Subtitles fetch failed:', subErr);
        for (const s of streamSources) {
          s.subtitles = [];
        }
      }

      return streamSources;
    } catch (err) {
      console.warn('[MovieBoxProvider] getStreams failed:', err);
      return [];
    }
  }
}
