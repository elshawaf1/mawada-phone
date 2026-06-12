-- ============================================
-- 20-consolidated-rls.sql — SINGLE AUTHORITATIVE RLS MIGRATION
-- 
-- Run this LAST to replace ALL prior RLS policies
-- (files 5, 6, 7, 8, 9, 10, 15)
-- ============================================

-- ============================================
-- STEP 1: Grant minimal schema & table privileges
-- ============================================

-- service_role (edge functions) gets full access
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- authenticated (mobile app users) gets schema access
GRANT USAGE ON SCHEMA public TO authenticated;

-- anon gets only schema usage (no table grants — C5 fix)
GRANT USAGE ON SCHEMA public TO anon;
-- Only grant SELECT on public-read tables to anon
GRANT SELECT ON public.products, public.categories, public.brands,
  public.banners, public.branches, public.product_images,
  public.product_variants, public.specifications, public.reviews TO anon;

-- Storage bucket schema
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;

-- ============================================
-- STEP 2: Drop ALL existing policies (clean slate)
-- ============================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename, schemaname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Create minimal, correct RLS policies
-- ============================================

-- ---------- PROFILES ----------
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- PRODUCTS ----------
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- CATEGORIES ----------
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BRANDS ----------
CREATE POLICY "brands_public_select" ON public.brands
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "brands_admin_all" ON public.brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BANNERS ----------
CREATE POLICY "banners_public_select" ON public.banners
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "banners_admin_all" ON public.banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- BRANCHES ----------
CREATE POLICY "branches_public_select" ON public.branches
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "branches_admin_all" ON public.branches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- PRODUCT IMAGES ----------
CREATE POLICY "pimages_public_select" ON public.product_images
  FOR SELECT USING (true);
CREATE POLICY "pimages_admin_all" ON public.product_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- PRODUCT VARIANTS ----------
CREATE POLICY "pvariants_public_select" ON public.product_variants
  FOR SELECT USING (true);
CREATE POLICY "pvariants_admin_all" ON public.product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- SPECIFICATIONS ----------
CREATE POLICY "specs_public_select" ON public.specifications
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
CREATE POLICY "orders_own_select" ON public.orders
  FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "orders_own_insert" ON public.orders
  FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "orders_own_update" ON public.orders
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- ORDER ITEMS ----------
CREATE POLICY "orderitems_own_select" ON public.order_items
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
CREATE POLICY "notif_own_select" ON public.notifications
  FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "notif_own_update" ON public.notifications
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "notif_admin_all" ON public.notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ---------- REVIEWS ----------
CREATE POLICY "reviews_public_select" ON public.reviews
  FOR SELECT USING ("isVisible" = true);
CREATE POLICY "reviews_own_insert" ON public.reviews
  FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "reviews_own_update" ON public.reviews
  FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- STEP 4: Storage policies
-- ============================================

-- Public reads
CREATE POLICY "storage_product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "storage_banner_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "storage_user_avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

-- Admin writes to product-images and banner-images
CREATE POLICY "storage_product_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "storage_product_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "storage_banner_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'banner-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "storage_banner_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'banner-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- User avatars
CREATE POLICY "storage_user_avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
