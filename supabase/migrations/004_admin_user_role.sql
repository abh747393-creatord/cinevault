-- Migration 004: Strict Single Admin Role Configuration
-- Admin email: abh747393@gmail.com

-- 1. Ensure existing user with email abh747393@gmail.com is promoted to admin
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = 'abh747393@gmail.com'
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Upsert profile for admin
    INSERT INTO public.profiles (id, display_name, role, updated_at)
    VALUES (target_user_id, 'Admin', 'admin', NOW())
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', updated_at = NOW();
  END IF;
END;
$$;

-- 2. Update is_admin() helper to verify either role='admin' in profiles OR token email claim matches
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) = 'abh747393@gmail.com'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automatic trigger on profiles to enforce abh747393@gmail.com gets 'admin'
CREATE OR REPLACE FUNCTION public.handle_profile_admin_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT LOWER(TRIM(email)) INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  IF user_email = 'abh747393@gmail.com' THEN
    NEW.role := 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_admin_role ON public.profiles;
CREATE TRIGGER trg_enforce_admin_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_admin_assignment();
