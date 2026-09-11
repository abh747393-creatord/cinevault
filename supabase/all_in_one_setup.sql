-- ==========================================================
-- CineVault: Complete All-in-One Database Setup for Supabase
-- Run this in Supabase Dashboard -> SQL Editor -> Click "Run"
-- ==========================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  preferred_language TEXT DEFAULT 'en',
  preferred_subtitle_language TEXT DEFAULT 'en',
  default_quality TEXT DEFAULT 'auto',
  autoplay_next BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Genres Table
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- 3. Content Table (Movies, TV, Anime)
CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv', 'anime')),
  title TEXT NOT NULL,
  original_title TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  release_date DATE,
  year INTEGER,
  runtime INTEGER,
  rating NUMERIC(3, 1) DEFAULT 0.0,
  age_rating TEXT,
  language TEXT DEFAULT 'en',
  country TEXT,
  status TEXT DEFAULT 'released',
  featured BOOLEAN DEFAULT false,
  cast_list TEXT[],
  director TEXT,
  quality TEXT DEFAULT '1080p',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Content Genres (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.content_genres (
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, genre_id)
);

-- 5. Seasons Table
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  poster_url TEXT,
  UNIQUE (content_id, season_number)
);

-- 6. Episodes Table
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  runtime INTEGER,
  release_date DATE,
  stream_url TEXT,
  UNIQUE (season_id, episode_number)
);

-- 7. Providers Table
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Content Sources Table
CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  source_type TEXT DEFAULT 'mp4',
  quality TEXT DEFAULT '1080p',
  language TEXT DEFAULT 'en',
  subtitle_available BOOLEAN DEFAULT false,
  stream_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Watch History Table
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  position_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, content_id, episode_id)
);

-- 10. Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_content_slug ON public.content(slug);
CREATE INDEX IF NOT EXISTS idx_content_type ON public.content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_year ON public.content(year);
CREATE INDEX IF NOT EXISTS idx_content_rating ON public.content(rating);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON public.genres(slug);
CREATE INDEX IF NOT EXISTS idx_seasons_content ON public.seasons(content_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON public.episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Helper function: check admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view active content" ON public.content;
CREATE POLICY "Public can view active content" ON public.content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view genres" ON public.genres;
CREATE POLICY "Public can view genres" ON public.genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view content_genres" ON public.content_genres;
CREATE POLICY "Public can view content_genres" ON public.content_genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view seasons" ON public.seasons;
CREATE POLICY "Public can view seasons" ON public.seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view episodes" ON public.episodes;
CREATE POLICY "Public can view episodes" ON public.episodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view enabled providers" ON public.providers;
CREATE POLICY "Public can view enabled providers" ON public.providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view content sources" ON public.content_sources;
CREATE POLICY "Public can view content sources" ON public.content_sources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own watch history" ON public.watch_history;
CREATE POLICY "Users can manage own watch history" ON public.watch_history FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.watchlist;
CREATE POLICY "Users can manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);

-- Seed Data: Genres
INSERT INTO public.genres (name, slug) VALUES
  ('Action', 'action'),
  ('Sci-Fi', 'sci-fi'),
  ('Animation', 'animation'),
  ('Comedy', 'comedy'),
  ('Drama', 'drama'),
  ('Fantasy', 'fantasy'),
  ('Thriller', 'thriller'),
  ('Horror', 'horror'),
  ('Adventure', 'adventure')
ON CONFLICT (slug) DO NOTHING;

-- Seed Data: Providers
INSERT INTO public.providers (name, slug, enabled, priority) VALUES
  ('Open Cinema Archive', 'open-cinema', true, 1),
  ('Creative Commons Stream CDN', 'cc-stream', true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Seed Data: Featured Titles
INSERT INTO public.content (
  id, external_id, content_type, title, original_title, slug, description,
  poster_url, backdrop_url, release_date, year, runtime, rating, age_rating,
  language, status, featured, quality
) VALUES
(
  '33333333-3333-3333-3333-000000000001',
  'tos-001',
  'movie',
  'Tears of Steel',
  'Tears of Steel: Project Mango',
  'tears-of-steel',
  'Set in a dystopian future Amsterdam, a ragtag team of military scientists and hackers gather at the Oude Kerk to stage a crucial historical event in a desperate bid to rescue the world from marauding robot titans.',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
  '2022-09-12', 2022, 12, 8.8, 'PG-13', 'English', 'released', true, '4K'
),
(
  '33333333-3333-3333-3333-000000000002',
  'sin-002',
  'movie',
  'Sintel',
  'Sintel: Durian Project',
  'sintel',
  'A lonely young warrior woman named Sintel rescues and befriends a wounded baby dragon, nursing it back to health. When an adult beast kidnaps the dragon, Sintel embarks on an arduous trek across barren wastes.',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
  '2023-01-15', 2023, 15, 8.9, 'PG-13', 'English', 'released', true, '4K'
)
ON CONFLICT (slug) DO NOTHING;
