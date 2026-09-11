-- CineVault Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Content & Metadata Public Read Policies
CREATE POLICY "Public can view active content"
  ON content FOR SELECT
  USING (true);

CREATE POLICY "Public can view genres"
  ON genres FOR SELECT
  USING (true);

CREATE POLICY "Public can view content_genres"
  ON content_genres FOR SELECT
  USING (true);

CREATE POLICY "Public can view seasons"
  ON seasons FOR SELECT
  USING (true);

CREATE POLICY "Public can view episodes"
  ON episodes FOR SELECT
  USING (true);

CREATE POLICY "Public can view enabled providers"
  ON providers FOR SELECT
  USING (enabled = true OR is_admin());

CREATE POLICY "Public can view content sources"
  ON content_sources FOR SELECT
  USING (true);

-- 3. Watch History Policies
CREATE POLICY "Users can view own watch history"
  ON watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch history"
  ON watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch history"
  ON watch_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch history"
  ON watch_history FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Watchlist Policies
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Admin Full Management Policies
CREATE POLICY "Admins have full access to content"
  ON content FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to genres"
  ON genres FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to seasons"
  ON seasons FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to episodes"
  ON episodes FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to providers"
  ON providers FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to content_sources"
  ON content_sources FOR ALL
  USING (is_admin());
