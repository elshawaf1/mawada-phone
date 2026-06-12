-- ============================================
-- 29. CRITICAL FIX: Profile policies + Grants
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. GRANTs - authenticated role must be able to read/write profiles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;

-- Anon SELECT on public tables
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.branches TO anon;
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.specifications TO anon;
GRANT SELECT ON public.reviews TO anon;

-- 2. Drop ALL existing profile policies (dynamic - covers any name)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- 3. Create admin check function (SECURITY DEFINER bypasses RLS - no recursion)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Recreate profile policies
-- INSERT: Allow trigger (auth.uid() IS NULL) OR user inserting own profile
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    OR auth.uid() = id
  );

-- SELECT: User reads own profile OR admin reads any (via SECURITY DEFINER function - no recursion)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- UPDATE: User updates own profile
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Fix the trigger to be bulletproof
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'CUSTOMER'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure all seed data is visible
UPDATE public.products SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.categories SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.banners SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.brands SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.branches SET "isActive" = true WHERE "isActive" IS NULL;

-- 6. Fix any users who don't have profiles (created before trigger was fixed)
INSERT INTO public.profiles (id, name, email, phone, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', ''),
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  'CUSTOMER'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
