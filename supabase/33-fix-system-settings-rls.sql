-- Mawada Phone - FIX: system_settings RLS permissions
-- Run this if you get "permission denied for table system_settings"

-- 1. Make sure RLS is enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Public read active settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "public_read_active_settings" ON public.system_settings;
DROP POLICY IF EXISTS "admins_manage_system_settings" ON public.system_settings;

-- 3. Recreate the public read policy (mobile app can read all active settings)
CREATE POLICY "public_read_active_settings" ON public.system_settings
  FOR SELECT
  USING (is_active = true);

-- 4. Recreate the admin full access policy
CREATE POLICY "admins_manage_system_settings" ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 5. Make sure all seed data has is_active = true
UPDATE public.system_settings SET is_active = true WHERE is_active IS NULL;

-- 6. Verify it works - this query should return all settings
SELECT key, value, is_active FROM public.system_settings ORDER BY sort_order;
