-- CineVault Seed SQL Data

-- 1. Seed Genres
INSERT INTO genres (id, name, slug) VALUES
  ('11111111-1111-1111-1111-000000000001', 'Action', 'action'),
  ('11111111-1111-1111-1111-000000000002', 'Sci-Fi', 'sci-fi'),
  ('11111111-1111-1111-1111-000000000003', 'Animation', 'animation'),
  ('11111111-1111-1111-1111-000000000004', 'Comedy', 'comedy'),
  ('11111111-1111-1111-1111-000000000005', 'Drama', 'drama'),
  ('11111111-1111-1111-1111-000000000006', 'Fantasy', 'fantasy'),
  ('11111111-1111-1111-1111-000000000007', 'Thriller', 'thriller'),
  ('11111111-1111-1111-1111-000000000008', 'Horror', 'horror'),
  ('11111111-1111-1111-1111-000000000009', 'Adventure', 'adventure'),
  ('11111111-1111-1111-1111-000000000010', 'Romance', 'romance')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Providers
INSERT INTO providers (id, name, slug, enabled, priority) VALUES
  ('22222222-2222-2222-2222-000000000001', 'Open Cinema Archive', 'open-cinema', true, 1),
  ('22222222-2222-2222-2222-000000000002', 'Creative Commons Stream CDN', 'cc-stream', true, 2),
  ('22222222-2222-2222-2222-000000000003', 'Public Domain Vault', 'public-domain', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed Featured Movie: Tears of Steel
INSERT INTO content (
  id, external_id, content_type, title, original_title, slug, description,
  poster_url, backdrop_url, release_date, year, runtime, rating, age_rating,
  language, country, status, featured, quality, director, cast_list
) VALUES (
  '33333333-3333-3333-3333-000000000001',
  'tos-001',
  'movie',
  'Tears of Steel',
  'Tears of Steel: Project Mango',
  'tears-of-steel',
  'Set in a dystopian future Amsterdam, a ragtag team of military scientists and hackers gather at the Oude Kerk to stage a crucial historical event in a desperate bid to rescue the world from marauding robot titans.',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
  '2022-09-12',
  2022,
  12,
  8.8,
  'PG-13',
  'English',
  'Netherlands',
  'released',
  true,
  '4K',
  'Ian Hubert',
  ARRAY['Derek de Lint', 'Sergio Hasselbaink', 'Rogier Schippers']
) ON CONFLICT (slug) DO NOTHING;

-- Link Movie Genres
INSERT INTO content_genres (content_id, genre_id) VALUES
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-000000000002'), -- Sci-Fi
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-000000000001')  -- Action
ON CONFLICT DO NOTHING;

-- Content Source for Tears of Steel
INSERT INTO content_sources (
  content_id, provider_id, source_type, quality, language, subtitle_available, stream_url
) VALUES (
  '33333333-3333-3333-3333-000000000001',
  '22222222-2222-2222-2222-000000000001',
  'mp4',
  '1080p',
  'English',
  true,
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
);
