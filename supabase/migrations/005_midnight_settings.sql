-- Migration 005: Midnight Security & Access Settings
-- Creates table for Midnight configuration, initial secure hash, and admin-only RLS

CREATE TABLE IF NOT EXISTS public.midnight_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN NOT NULL DEFAULT true,
  passcode_hash TEXT NOT NULL,
  passcode_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.midnight_settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role to do everything
CREATE POLICY "Service role full access on midnight_settings"
  ON public.midnight_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read settings
CREATE POLICY "Admins can view midnight_settings"
  ON public.midnight_settings
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Allow admins to update settings
CREATE POLICY "Admins can update midnight_settings"
  ON public.midnight_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert default record with PBKDF2 hash (without plaintext passcode)
INSERT INTO public.midnight_settings (id, enabled, passcode_hash, passcode_version, updated_at, updated_by)
VALUES (
  'default',
  true,
  'pbkdf2:sha512:100000:7d5a3bef458029c7f4ff3ecbeda913c1:388f8cac8e730bdc46de93fee1f764e2b3487785ffb57da0432acf296e8e82d1f5f3a21d7f1fbace6e78cd6018dac6f9b466ddb07a11560d2d8169a8ea88f5cd',
  1,
  NOW(),
  'system'
)
ON CONFLICT (id) DO NOTHING;
