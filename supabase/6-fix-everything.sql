-- ============================================
-- 6-fix-everything.sql
-- Run this in the Supabase Dashboard SQL Editor
-- 1. Enables RLS + creates policies
-- 2. Creates profile trigger for new signups
-- 3. Backfills missing profiles
-- 4. Inserts seed data if needed
-- ============================================

-- ============================================
-- 1. PROFILE TRIGGER (auto-create profile on signup)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    'CUSTOMER'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP ALL EXISTING POLICIES (fresh start)
-- ============================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename, schemaname FROM pg_policies WHERE schemaname='public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Storage policies too
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete banner images" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete banner images" ON storage.objects;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Profiles: authenticated read+insert own, user update own, anon read (admin dashboard)
CREATE POLICY "profiles_auth_select" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_anon_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Products: anon CRUD (admin), authenticated can view active
CREATE POLICY "products_anon_all" ON public.products FOR ALL USING (true);
CREATE POLICY "products_auth_select_active" ON public.products FOR SELECT USING ("isActive" = true);

-- Categories: anon CRUD, authenticated can view active
CREATE POLICY "categories_anon_all" ON public.categories FOR ALL USING (true);
CREATE POLICY "categories_auth_select_active" ON public.categories FOR SELECT USING ("isActive" = true);

-- Brands: anon CRUD, authenticated can view active
CREATE POLICY "brands_anon_all" ON public.brands FOR ALL USING (true);
CREATE POLICY "brands_auth_select_active" ON public.brands FOR SELECT USING ("isActive" = true);

-- Banners: anon CRUD, authenticated can view active
CREATE POLICY "banners_anon_all" ON public.banners FOR ALL USING (true);
CREATE POLICY "banners_auth_select_active" ON public.banners FOR SELECT USING ("isActive" = true);

-- Branches: anon CRUD, authenticated can view active
CREATE POLICY "branches_anon_all" ON public.branches FOR ALL USING (true);
CREATE POLICY "branches_auth_select_active" ON public.branches FOR SELECT USING ("isActive" = true);

-- Product Images: anon CRUD, anyone can view
CREATE POLICY "pimages_anon_all" ON public.product_images FOR ALL USING (true);
CREATE POLICY "pimages_anyone_select" ON public.product_images FOR SELECT USING (true);

-- Product Variants: anon CRUD, anyone can view
CREATE POLICY "pvariants_anon_all" ON public.product_variants FOR ALL USING (true);
CREATE POLICY "pvariants_anyone_select" ON public.product_variants FOR SELECT USING (true);

-- Specifications: anon CRUD, anyone can view
CREATE POLICY "specs_anon_all" ON public.specifications FOR ALL USING (true);
CREATE POLICY "specs_anyone_select" ON public.specifications FOR SELECT USING (true);

-- Orders: anon CRUD (admin), authenticated own orders
CREATE POLICY "orders_anon_all" ON public.orders FOR ALL USING (true);
CREATE POLICY "orders_own_select" ON public.orders FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "orders_own_insert" ON public.orders FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "orders_own_update" ON public.orders FOR UPDATE USING ("userId" = auth.uid());

-- Order Items: anon CRUD (admin), authenticated own items
CREATE POLICY "orderitems_anon_all" ON public.order_items FOR ALL USING (true);
CREATE POLICY "orderitems_own_select" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items."orderId" AND orders."userId" = auth.uid())
);

-- Cart Items: users manage own
CREATE POLICY "cart_own_all" ON public.cart_items FOR ALL USING ("userId" = auth.uid());

-- Wishlist: users manage own
CREATE POLICY "wishlist_own_all" ON public.wishlist_items FOR ALL USING ("userId" = auth.uid());

-- Addresses: users manage own
CREATE POLICY "addresses_own_all" ON public.addresses FOR ALL USING ("userId" = auth.uid());

-- Notifications: anon CRUD (admin), users view own
CREATE POLICY "notif_anon_all" ON public.notifications FOR ALL USING (true);
CREATE POLICY "notif_own_select" ON public.notifications FOR SELECT USING ("userId" = auth.uid());

-- Reviews: anon CRUD (admin), anyone view visible, users create
CREATE POLICY "reviews_anon_all" ON public.reviews FOR ALL USING (true);
CREATE POLICY "reviews_anyone_select_visible" ON public.reviews FOR SELECT USING ("isVisible" = true);
CREATE POLICY "reviews_own_insert" ON public.reviews FOR INSERT WITH CHECK ("userId" = auth.uid());

-- ============================================
-- 5. STORAGE POLICIES
-- ============================================
CREATE POLICY "storage_product_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "storage_product_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "storage_product_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
CREATE POLICY "storage_banner_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "storage_banner_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banner-images');
CREATE POLICY "storage_banner_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'banner-images');
CREATE POLICY "storage_user_avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "storage_user_avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 6. BACKFILL MISSING PROFILES
-- ============================================
INSERT INTO public.profiles (id, email, name, role)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)), 'CUSTOMER'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Set admin roles
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email IN ('elshawaf@mawadaphone.com', 'admin@mawadaphone.com');

-- ============================================
-- 7. ENABLE REALTIME (for notifications)
-- ============================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE notifications, orders;
COMMIT;
