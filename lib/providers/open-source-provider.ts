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

    let url1080 = 'https://vjs.zencdn.net/v/oceans.mp4';
    let url720 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
    let url480 = 'https://www.w3schools.com/html/mov_bbb.mp4';

    if (item.contentType === 'tv' || item.contentType === 'anime') {
      if (item.seasons) {
        for (const s of item.seasons) {
          const ep = s.episodes.find((e) => e.id === episodeId);
          if (ep && ep.streamUrl) {
            url1080 = ep.streamUrl;
            url720 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
            url480 = 'https://www.w3schools.com/html/mov_bbb.mp4';
            break;
          }
        }
      }
    } else {
      // Direct movie mapping with distinct working CDN URLs
      if (item.slug === 'tears-of-steel') {
        url1080 = 'https://dn710301.ca.archive.org/0/items/Tears-of-Steel/tears_of_steel_720p.mp4';
        url720 = 'https://vjs.zencdn.net/v/oceans.mp4';
        url480 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
      } else if (item.slug === 'sintel') {
        url1080 = 'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_10MB.mp4';
        url720 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
        url480 = 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_5MB.mp4';
      } else if (item.slug === 'big-buck-bunny') {
        url1080 = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_10MB.mp4';
        url720 = 'https://media.w3.org/2010/05/bunny/trailer.mp4';
        url480 = 'https://www.w3schools.com/html/mov_bbb.mp4';
      } else if (item.slug === 'elephants-dream') {
        url1080 = 'https://vjs.zencdn.net/v/oceans.mp4';
        url720 = 'https://media.w3.org/2010/05/bunny/trailer.mp4';
        url480 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      } else if (item.slug === 'cosmos-laundromat') {
        url1080 = 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_10MB.mp4';
        url720 = 'https://vjs.zencdn.net/v/oceans.mp4';
        url480 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
      } else if (item.slug === 'charge') {
        url1080 = 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_5MB.mp4';
        url720 = 'https://media.w3.org/2010/05/bunny/trailer.mp4';
        url480 = 'https://www.w3schools.com/html/mov_bbb.mp4';
      } else if (item.slug === 'spring') {
        url1080 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
        url720 = 'https://vjs.zencdn.net/v/oceans.mp4';
        url480 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      } else {
        url1080 = 'https://dn710301.ca.archive.org/0/items/Tears-of-Steel/tears_of_steel_720p.mp4';
        url720 = 'https://vjs.zencdn.net/v/oceans.mp4';
        url480 = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
      }
    }

    return [
      {
        id: `stream-${item.id}-1080p`,
        url: url1080,
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
        url: url720,
        quality: '720p',
        format: 'mp4',
        providerId: this.id,
        providerName: 'High-Speed CDN Mirror',
        bitrate: 2200000,
        subtitles: SAMPLE_SUBTITLES,
      },
      {
        id: `stream-${item.id}-480p`,
        url: url480,
        quality: '480p',
        format: 'mp4',
        providerId: this.id,
        providerName: 'Standard CDN Mirror',
        bitrate: 1000000,
        subtitles: SAMPLE_SUBTITLES,
      },
    ];
  }
}
