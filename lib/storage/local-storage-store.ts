'use client';

import { ContentItem } from '@/types/content';
import { UserProfile, WatchHistoryItem, WatchlistItem } from '@/types/user';

const STORAGE_KEYS = {
  USER: 'cinevault_user_profile',
  WATCHLIST: 'cinevault_watchlist',
  WATCH_HISTORY: 'cinevault_watch_history',
  SETTINGS: 'cinevault_user_settings',
  ADMIN_ROLE: 'cinevault_admin_override',
  FAVORITES: 'cinevault_favorites',
};

export const DEFAULT_USER: UserProfile = {
  id: 'demo-user-123',
  email: 'viewer@cinevault.local',
  username: 'cinephile',
  displayName: 'Alex Cinema',
  avatarUrl: '/images/neutral-poster.svg',
  role: 'admin', // defaulted to admin in demo mode so full admin features can be tested
  preferredLanguage: 'English',
  preferredSubtitleLanguage: 'English',
  defaultQuality: '1080p',
  autoplayNext: true,
  theme: 'dark',
  createdAt: '2024-01-01T00:00:00.000Z',
  stats: {
    hoursWatched: 0,
    completedTitles: 0,
    watchlistCount: 0,
  },
};

export function getStoredUser(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_USER;
  }
}

export function saveStoredUser(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user profile to localStorage', err);
  }
}

export function getStoredWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addToWatchlist(item: ContentItem): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredWatchlist();
  if (current.some((w) => w.contentId === item.id)) return current;

  const newItem: WatchlistItem = {
    id: `wl-${Date.now()}`,
    userId: getStoredUser().id,
    contentId: item.id,
    content: item,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...current];
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(updated));
  return updated;
}

export function removeFromWatchlist(contentId: string): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredWatchlist();
  const updated = current.filter((w) => w.contentId !== contentId);
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(updated));
  return updated;
}

export function isInWatchlist(contentId: string): boolean {
  if (typeof window === 'undefined') return false;
  return getStoredWatchlist().some((w) => w.contentId === contentId);
}

export function getStoredHistory(): WatchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveWatchProgress(
  content: ContentItem,
  positionSeconds: number,
  durationSeconds: number,
  episodeId?: string
): WatchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredHistory();
  const user = getStoredUser();

  const completed = durationSeconds > 0 && positionSeconds / durationSeconds >= 0.9;

  let episode = undefined;
  if (episodeId && content.seasons) {
    for (const s of content.seasons) {
      const found = s.episodes.find((e) => e.id === episodeId);
      if (found) {
        episode = found;
        break;
      }
    }
  }

  const existingIdx = current.findIndex(
    (h) => h.contentId === content.id && (!episodeId || h.episodeId === episodeId)
  );

  const updatedItem: WatchHistoryItem = {
    id: existingIdx >= 0 ? current[existingIdx].id : `hist-${Date.now()}`,
    userId: user.id,
    contentId: content.id,
    content: {
      ...content,
      seasons: undefined,
    },
    episodeId,
    episode,
    positionSeconds,
    durationSeconds: durationSeconds || 1,
    completed,
    lastWatchedAt: new Date().toISOString(),
  };

  let updatedList: WatchHistoryItem[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedItem;
    // Move to front
    updatedList.splice(existingIdx, 1);
    updatedList.unshift(updatedItem);
  } else {
    updatedList = [updatedItem, ...current];
  }

  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(updatedList));
  return updatedList;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
}

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToFavorites(contentId: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getFavorites();
  if (current.includes(contentId)) return current;
  const updated = [contentId, ...current];
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

export function removeFromFavorites(contentId: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getFavorites();
  const updated = current.filter((id) => id !== contentId);
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

export function isFavorited(contentId: string): boolean {
  if (typeof window === 'undefined') return false;
  return getFavorites().includes(contentId);
}
