import { ContentProvider } from './provider-interface';
import { ContentItem, Episode } from '@/types/content';
import { StreamSource, ProviderSearchResult, ProviderMetadata } from '@/types/providers';
import { SEED_CONTENT, SAMPLE_SUBTITLES } from '@/lib/data/catalog-seed';

export class OpenSourceProvider implements ContentProvider {
  id = 'provider-open-cinema';
  name = 'Open Cinema & Public Domain Archive';
  slug = 'open-cinema';
  enabled = true;
  priority = 1;

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

  async search(query: string): Promise<ProviderSearchResult[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return SEED_CONTENT
      .filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.genres.some((g) => g.name.toLowerCase().includes(q))
      )
      .map((item) => ({
        id: item.id,
        providerId: this.id,
        title: item.title,
        year: item.year,
        contentType: item.contentType,
        posterUrl: item.posterUrl,
        overview: item.description,
      }));
  }

  async getMovie(idOrSlug: string): Promise<ContentItem | null> {
    const found = SEED_CONTENT.find(
      (c) => (c.id === idOrSlug || c.slug === idOrSlug) && c.contentType === 'movie'
    );
    return found || null;
  }

  async getTvShow(idOrSlug: string): Promise<ContentItem | null> {
    const found = SEED_CONTENT.find(
      (c) => (c.id === idOrSlug || c.slug === idOrSlug) && (c.contentType === 'tv' || c.contentType === 'anime')
    );
    return found || null;
  }

  async getEpisodes(contentId: string, seasonNumber: number = 1): Promise<Episode[]> {
    const show = SEED_CONTENT.find((c) => c.id === contentId || c.slug === contentId);
    if (!show || !show.seasons) return [];

    const season = show.seasons.find((s) => s.seasonNumber === seasonNumber) || show.seasons[0];
    return season?.episodes || [];
  }

  async getStreams(contentId: string, episodeId?: string): Promise<StreamSource[]> {
    const item = SEED_CONTENT.find((c) => c.id === contentId || c.slug === contentId);
    if (!item) return [];

    let streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

    if (item.contentType === 'tv' || item.contentType === 'anime') {
      if (item.seasons) {
        for (const s of item.seasons) {
          const ep = s.episodes.find((e) => e.id === episodeId);
          if (ep && ep.streamUrl) {
            streamUrl = ep.streamUrl;
            break;
          }
        }
      }
    } else {
      // Direct movie mapping
      if (item.slug === 'big-buck-bunny') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      } else if (item.slug === 'sintel') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
      } else if (item.slug === 'elephants-dream') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
      } else if (item.slug === 'cosmos-laundromat') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      } else if (item.slug === 'charge') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
      } else if (item.slug === 'spring') {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
      } else {
        streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
      }
    }

    return [
      {
        id: `stream-${item.id}-1080p`,
        url: streamUrl,
        quality: '1080p',
        format: 'mp4',
        providerId: this.id,
        providerName: this.name,
        bitrate: 4500000,
        subtitles: SAMPLE_SUBTITLES,
        audioTracks: [
          { id: 'aud-en', language: 'en', label: 'English (Original)', isDefault: true },
          { id: 'aud-jp', language: 'ja', label: 'Japanese', isDefault: false },
        ],
      },
      {
        id: `stream-${item.id}-720p`,
        url: streamUrl,
        quality: '720p',
        format: 'mp4',
        providerId: this.id,
        providerName: this.name,
        bitrate: 2200000,
        subtitles: SAMPLE_SUBTITLES,
      },
      {
        id: `stream-${item.id}-480p`,
        url: streamUrl,
        quality: '480p',
        format: 'mp4',
        providerId: this.id,
        providerName: this.name,
        bitrate: 1000000,
        subtitles: SAMPLE_SUBTITLES,
      },
    ];
  }
}
