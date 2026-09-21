import { Genre } from '@/types/content';

export const GENRES: Genre[] = [
  { id: 'g-action', name: 'Action', slug: 'action' },
  { id: 'g-scifi', name: 'Sci-Fi', slug: 'sci-fi' },
  { id: 'g-animation', name: 'Animation', slug: 'animation' },
  { id: 'g-comedy', name: 'Comedy', slug: 'comedy' },
  { id: 'g-drama', name: 'Drama', slug: 'drama' },
  { id: 'g-fantasy', name: 'Fantasy', slug: 'fantasy' },
  { id: 'g-thriller', name: 'Thriller', slug: 'thriller' },
  { id: 'g-horror', name: 'Horror', slug: 'horror' },
  { id: 'g-adventure', name: 'Adventure', slug: 'adventure' },
  { id: 'g-mystery', name: 'Mystery', slug: 'mystery' },
  { id: 'g-romance', name: 'Romance', slug: 'romance' },
];

export const SEED_GENRES = GENRES;
