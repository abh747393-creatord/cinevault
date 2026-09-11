export type StreamQuality = '4K' | '1080p' | '720p' | '480p' | '360p' | 'auto';
export type StreamFormat = 'mp4' | 'hls' | 'webm';

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  src: string;
  kind?: 'subtitles' | 'captions';
  default?: boolean;
}

export interface AudioTrack {
  id: string;
  language: string;
  label: string;
  isDefault?: boolean;
}

export interface StreamSource {
  id: string;
  url: string;
  quality: StreamQuality;
  format: StreamFormat;
  providerId: string;
  providerName: string;
  bitrate?: number;
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
}

export interface ProviderSearchResult {
  id: string;
  providerId: string;
  title: string;
  year?: number;
  contentType: 'movie' | 'tv' | 'anime';
  posterUrl?: string;
  overview?: string;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  priority: number;
  status: 'active' | 'degraded' | 'disabled';
  lastChecked?: string;
  errorCount?: number;
}
