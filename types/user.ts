import { ContentItem, Episode } from './content';

export type UserRole = 'user' | 'admin' | 'moderator';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  preferredLanguage: string;
  preferredSubtitleLanguage: string;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  autoplayNext: boolean;
  theme: 'dark' | 'light' | 'system';
  createdAt: string;
  updatedAt?: string;
  stats?: {
    hoursWatched: number;
    completedTitles: number;
    watchlistCount: number;
  };
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  contentId: string;
  content: ContentItem;
  episodeId?: string;
  episode?: Episode;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  contentId: string;
  content: ContentItem;
  createdAt: string;
}
