-- Mawada Phone - 26. FIX PROFILE CREATION TRIGGER
-- ============================================
-- The profiles_own_insert policy blocks the trigger because auth.uid() is NULL in trigger context
-- SECURITY DEFINER functions bypass RLS, but the policy still evaluates
-- Fix: Allow INSERT when auth.uid() IS NULL (system context like trigger)

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;

-- Allow profile creation by:
-- 1. System context (trigger, auth.uid() IS NULL) 
-- 2. Users inserting their own profile
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL  -- Allow trigger/system inserts
    OR auth.uid() = id  -- Allow users to insert their own profile
  );

-- Also ensure SELECT policy works for new users immediately after creation
-- The existing "profiles_own_select" requires auth.uid() = id
-- This should work once the user is authenticated