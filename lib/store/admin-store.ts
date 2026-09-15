'use client';

import { FranchiseCollection, FRANCHISE_COLLECTIONS } from '@/lib/data/collections-data';

export interface HeroSlide {
  id: string;
  title: string;
  tagline: string;
  description: string;
  backdropUrl: string;
  posterUrl: string;
  contentType: 'movie' | 'tv' | 'anime';
  year: number;
  rating: number;
  quality: string;
  slug: string;
  active: boolean;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-1',
    title: 'Deadpool & Wolverine',
    tagline: 'The multiverse will never be the same.',
    description: 'Wolverine is recovering from his injuries when he crosses paths with the loudmouth, Deadpool. They team up to defeat a common enemy.',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    contentType: 'movie',
    year: 2024,
    rating: 9.4,
    quality: '4K Ultra HD',
    slug: 'deadpool-and-wolverine',
    active: true,
  },
  {
    id: 'hero-2',
    title: 'Jujutsu Kaisen: Execution',
    tagline: 'Cursed energy unleashed in the Shibuya aftermath.',
    description: 'Following the devastating Shibuya Incident, the sorcerers face intense trials against Special Grade curses.',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hEpWvX6Bp79eLxY64790K230.jpg',
    contentType: 'anime',
    year: 2025,
    rating: 9.6,
    quality: '1080p Dual Audio',
    slug: 'jujutsu-kaisen',
    active: true,
  },
  {
    id: 'hero-3',
    title: 'Squid Game S2',
    tagline: 'The real game begins now.',
    description: 'Player 456 returns with vengeance in mind, plunging once more into the deadly high-stakes competition.',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    posterUrl: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    contentType: 'tv',
    year: 2024,
    rating: 9.3,
    quality: '4K HDR',
    slug: 'squid-game',
    active: true,
  },
];

const ADMIN_STORAGE_KEY_SLIDES = 'cinevault_admin_hero_slides';
const ADMIN_STORAGE_KEY_BLACKLIST = 'cinevault_admin_custom_blacklist';
const ADMIN_STORAGE_KEY_COLLECTIONS = 'cinevault_admin_custom_collections';

export function getStoredHeroSlides(): HeroSlide[] {
  if (typeof window === 'undefined') return DEFAULT_HERO_SLIDES;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY_SLIDES);
    if (!raw) return DEFAULT_HERO_SLIDES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HERO_SLIDES;
  }
}

export function saveStoredHeroSlides(slides: HeroSlide[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_STORAGE_KEY_SLIDES, JSON.stringify(slides));
}

export function getStoredCustomBlacklist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY_BLACKLIST);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredCustomBlacklist(words: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_STORAGE_KEY_BLACKLIST, JSON.stringify(words));
}

export function getStoredCustomCollections(): FranchiseCollection[] {
  if (typeof window === 'undefined') return FRANCHISE_COLLECTIONS;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY_COLLECTIONS);
    if (!raw) return FRANCHISE_COLLECTIONS;
    return JSON.parse(raw);
  } catch {
    return FRANCHISE_COLLECTIONS;
  }
}

export function saveStoredCustomCollections(collections: FranchiseCollection[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_STORAGE_KEY_COLLECTIONS, JSON.stringify(collections));
}
