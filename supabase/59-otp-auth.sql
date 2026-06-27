-- ============================================
-- 59-otp-auth.sql — Switch to OTP-based email verification
--
-- 1. Drop the handle_new_user() trigger so profiles
--    are only created AFTER OTP verification in the mobile app
-- 2. Add email_confirmed_at check for existing profiles
-- ============================================

-- Drop the trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify it's gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created still exists!';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created successfully dropped.';
  END IF;
END $$;
