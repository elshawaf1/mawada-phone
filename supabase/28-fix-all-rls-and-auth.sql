-- ============================================
-- 28. COMPREHENSIVE FIX: RLS + Auth + Profile Trigger
-- Run this SINGLE migration in Supabase SQL Editor
-- It replaces the need to run 26 or 27 separately
-- ============================================

-- ============================================
-- PART 1: Fix Grants - Ensure anon/authenticated can read public tables
-- ============================================

-- Anon needs SELECT on all public-read tables
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.branches TO anon;
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.specifications TO anon;
GRANT SELECT ON public.reviews TO anon;

-- Authenticated users need full CRUD on their own data
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;

-- ============================================
-- PART 2: Drop ALL existing policies (clean slate)
-- ============================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename, schemaname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- PART 3: Recreate ALL RLS policies
-- ============================================

-- ---------- PROFILES ----------
-- Allow trigger/system inserts (auth.uid() IS NULL in trigger context)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    OR auth.uid() = id
  );
-- Users read own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
-- Users update own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---------- PRODUCTS ----------
-- Public can read active products (anon + authenticated)
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING ("isActive" = true);
-- Admins can do everything
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- CATEGORIES ----------
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BRANDS ----------
CREATE POLICY "brands_select" ON public.brands
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "brands_admin_all" ON public.brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BANNERS ----------
CREATE POLICY "banners_select" ON public.banners
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "banners_admin_all" ON public.banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BRANCHES ----------
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "branches_admin_all" ON public.branches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- PRODUCT IMAGES ----------
CREATE POLICY "pimages_select" ON public.product_images
  FOR SELECT USING (true);
CREATE POLICY "pimages_admin_all" ON public.product_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- PRODUCT VARIANTS ----------
CREATE POLICY "pvariants_select" ON public.product_variants
  FOR SELECT USING (true);
CREATE POLICY "pvariants_admin_all" ON public.product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- SPECIFICATIONS ----------
CREATE POLICY "specs_select" ON public.specifications
  FOR SELECT USING (true);
CREATE POLICY "specs_admin_all" ON public.specifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- CART ITEMS ----------
CREATE POLICY "cart_own_all" ON public.cart_items
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- ---------- WISHLIST ITEMS ----------
CREATE POLICY "wishlist_own_all" ON public.wishlist_items
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- ---------- ORDERS ----------
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "orders_update_own" ON public.orders
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- ORDER ITEMS ----------
CREATE POLICY "orderitems_select_own" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders
      WHERE orders.id = order_items."orderId" AND orders."userId" = auth.uid())
  );
CREATE POLICY "orderitems_admin_all" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- ADDRESSES ----------
CREATE POLICY "addresses_own_all" ON public.addresses
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- ---------- NOTIFICATIONS ----------
CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "notif_admin_all" ON public.notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- REVIEWS ----------
CREATE POLICY "reviews_select_public" ON public.reviews
  FOR SELECT USING ("isVisible" = true);
CREATE POLICY "reviews_select_own" ON public.reviews
  FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- PART 4: Fix seed data - ensure all isActive = true
-- ============================================
UPDATE public.products SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.categories SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.banners SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.brands SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE public.branches SET "isActive" = true WHERE "isActive" IS NULL;

-- ============================================
-- PART 5: Verify handle_new_user trigger exists and is SECURITY DEFINER
-- ============================================
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
