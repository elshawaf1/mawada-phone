-- Mawada Phone - Fix Auth Issues
-- Run this to fix infinite recursion, create missing profiles, and fix auth

-- ============================================
-- 1. DROP ALL PROFILES POLICIES (remove recursion)
-- ============================================
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users view profiles" ON public.profiles;

-- Drop the recursive function
DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================
-- 2. CREATE SIMPLE NON-RECURSIVE POLICIES
-- ============================================

-- Any authenticated user can read profiles (safe: no passwords stored here)
CREATE POLICY "Authenticated users view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================
-- 3. CREATE MISSING PROFILES FOR EXISTING USERS
-- ============================================

INSERT INTO public.profiles (id, name, email, phone, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', ''),
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  'CUSTOMER'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

-- ============================================
-- 4. SET ADMIN ROLES
-- ============================================

UPDATE public.profiles SET role = 'ADMIN'
WHERE email IN ('elshawaf@mawadaphone.com', 'admin@mawadaphone.com');

-- ============================================
-- 5. VERIFY
-- ============================================

-- Check all users have profiles (should return 0 rows)
SELECT au.id as user_id, au.email, p.id as profile_id, p.role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Check admin users
SELECT id, email, role FROM public.profiles WHERE role = 'ADMIN';
