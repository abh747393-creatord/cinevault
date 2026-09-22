export type ContentType = 'movie' | 'tv' | 'anime' | 'drama';

export interface FranchiseCollection {
  id: string;
  slug: string;
  name: string;
  category: 'movies' | 'tv' | 'anime' | 'dramas' | 'all';
  tagline: string;
  description: string;
  bannerUrl: string;
  posterUrl: string;
  itemCount?: number;
  featured?: boolean;
  keywords?: string[];
  genres?: string[];
  languageHints?: string[];
  titleHints?: string[];
  providerTab?: 'all' | 'movie' | 'tv' | '9';
  mediaType?: 'movie' | 'series' | 'all';
  searchQueries: string[];
  curatedTitles?: string[];
  requiredKeywords?: string[];
}

export type CollectionDefinition = FranchiseCollection;

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Episode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  runtime: number; // in minutes
  releaseDate?: string;
  streamUrl?: string;
}

export interface Season {
  id: string;
  contentId: string;
  seasonNumber: number;
  title: string;
  description: string;
  posterUrl?: string;
  episodes: Episode[];
}

export interface ContentItem {
  id: string;
  externalId?: string;
  contentType: ContentType;
  title: string;
  originalTitle?: string;
  slug: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  year: number;
  runtime?: number; // minutes for movies
  rating?: number; // e.g. 8.4
  ageRating?: string; // e.g. 'PG-13', 'TV-MA'
  language: string;
  country?: string;
  status: 'released' | 'upcoming' | 'ongoing' | 'ended';
  featured?: boolean;
  genres: Genre[];
  cast?: string[];
  director?: string;
  quality?: '4K' | '1080p' | '720p';
  availableAudio?: string[];
  availableSubtitles?: string[];
  dubs?: { subject_id: string; language: string; label: string }[];
  seasons?: Season[];
  trailerUrl?: string;
  youtubeId?: string;
}

export interface ContentFilterOptions {
  contentType?: ContentType;
  genreSlug?: string;
  year?: number;
  minRating?: number;
  sortBy?: 'popular' | 'latest' | 'rating' | 'alphabetical';
  searchQuery?: string;
}
