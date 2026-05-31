-- ============================================
-- 7-fix-admin-permissions.sql
-- Run this in Supabase Dashboard SQL Editor
-- Fixes: "permission denied" errors when using
-- the admin dashboard with anon key
-- ============================================

-- ============================================
-- STEP 1: Grant base table privileges to anon role
-- Without these, RLS policies have no effect
-- because the role can't access tables at all.
-- ============================================
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO anon;

-- Cart, wishlist, addresses: anon needs INSERT for signup flow
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO anon;

-- Storage bucket access
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT, INSERT, DELETE ON storage.objects TO anon;

-- ============================================
-- STEP 2: Drop all existing policies for a clean slate
-- ============================================
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins manage all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins manage specifications" ON public.specifications;
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete banner images" ON storage.objects;
DROP POLICY IF EXISTS "Anon view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon manage products" ON public.products;
DROP POLICY IF EXISTS "Anon manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anon manage brands" ON public.brands;
DROP POLICY IF EXISTS "Anon manage banners" ON public.banners;
DROP POLICY IF EXISTS "Anon manage branches" ON public.branches;
DROP POLICY IF EXISTS "Anon manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Anon manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Anon manage specifications" ON public.specifications;
DROP POLICY IF EXISTS "Anon manage orders" ON public.orders;
DROP POLICY IF EXISTS "Anon manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anon manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anon upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete banner images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Anyone can view branches" ON public.branches;
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Anyone can view specifications" ON public.specifications;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Product images public read" ON storage.objects;
DROP POLICY IF EXISTS "Banner images public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_anon_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
DROP POLICY IF EXISTS "products_anon_all" ON public.products;
DROP POLICY IF EXISTS "products_auth_select_active" ON public.products;
DROP POLICY IF EXISTS "categories_anon_all" ON public.categories;
DROP POLICY IF EXISTS "categories_auth_select_active" ON public.categories;
DROP POLICY IF EXISTS "brands_anon_all" ON public.brands;
DROP POLICY IF EXISTS "brands_auth_select_active" ON public.brands;
DROP POLICY IF EXISTS "banners_anon_all" ON public.banners;
DROP POLICY IF EXISTS "banners_auth_select_active" ON public.banners;
DROP POLICY IF EXISTS "branches_anon_all" ON public.branches;
DROP POLICY IF EXISTS "branches_auth_select_active" ON public.branches;
DROP POLICY IF EXISTS "pimages_anon_all" ON public.product_images;
DROP POLICY IF EXISTS "pimages_anyone_select" ON public.product_images;
DROP POLICY IF EXISTS "pvariants_anon_all" ON public.product_variants;
DROP POLICY IF EXISTS "pvariants_anyone_select" ON public.product_variants;
DROP POLICY IF EXISTS "specs_anon_all" ON public.specifications;
DROP POLICY IF EXISTS "specs_anyone_select" ON public.specifications;
DROP POLICY IF EXISTS "orders_anon_all" ON public.orders;
DROP POLICY IF EXISTS "orders_own_select" ON public.orders;
DROP POLICY IF EXISTS "orders_own_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_own_update" ON public.orders;
DROP POLICY IF EXISTS "orderitems_anon_all" ON public.order_items;
DROP POLICY IF EXISTS "orderitems_own_select" ON public.order_items;
DROP POLICY IF EXISTS "cart_own_all" ON public.cart_items;
DROP POLICY IF EXISTS "wishlist_own_all" ON public.wishlist_items;
DROP POLICY IF EXISTS "addresses_own_all" ON public.addresses;
DROP POLICY IF EXISTS "notif_anon_all" ON public.notifications;
DROP POLICY IF EXISTS "notif_own_select" ON public.notifications;
DROP POLICY IF EXISTS "reviews_anon_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_anyone_select_visible" ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_insert" ON public.reviews;
DROP POLICY IF EXISTS "storage_product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_banner_images_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_banner_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_banner_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_user_avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_user_avatars_insert" ON storage.objects;

-- ============================================
-- STEP 3: Create permissive policies for admin
-- (anon key) CRUD operations
-- ============================================

-- Profiles: anon can read (admin dashboard needs this)
CREATE POLICY "profiles_anon_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Products: anon can do everything (admin CRUD)
CREATE POLICY "products_anon_all" ON public.products FOR ALL USING (true);

-- Categories: anon can do everything (admin CRUD)
CREATE POLICY "categories_anon_all" ON public.categories FOR ALL USING (true);

-- Brands: anon can do everything (admin CRUD)
CREATE POLICY "brands_anon_all" ON public.brands FOR ALL USING (true);

-- Banners: anon can do everything (admin CRUD)
CREATE POLICY "banners_anon_all" ON public.banners FOR ALL USING (true);

-- Branches: anon can do everything (admin CRUD)
CREATE POLICY "branches_anon_all" ON public.branches FOR ALL USING (true);

-- Product Images: anon can do everything (admin CRUD)
CREATE POLICY "pimages_anon_all" ON public.product_images FOR ALL USING (true);

-- Product Variants: anon can do everything (admin CRUD)
CREATE POLICY "pvariants_anon_all" ON public.product_variants FOR ALL USING (true);

-- Specifications: anon can do everything (admin CRUD)
CREATE POLICY "specs_anon_all" ON public.specifications FOR ALL USING (true);

-- Orders: anon CRUD (admin), users manage own
CREATE POLICY "orders_anon_all" ON public.orders FOR ALL USING (true);
CREATE POLICY "orders_own_select" ON public.orders FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "orders_own_insert" ON public.orders FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "orders_own_update" ON public.orders FOR UPDATE USING ("userId" = auth.uid());

-- Order Items: anon CRUD (admin), users own items
CREATE POLICY "orderitems_anon_all" ON public.order_items FOR ALL USING (true);
CREATE POLICY "orderitems_own_select" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items."orderId" AND orders."userId" = auth.uid())
);

-- Cart Items: users manage own only
CREATE POLICY "cart_own_all" ON public.cart_items FOR ALL USING ("userId" = auth.uid());

-- Wishlist: users manage own only
CREATE POLICY "wishlist_own_all" ON public.wishlist_items FOR ALL USING ("userId" = auth.uid());

-- Addresses: users manage own only
CREATE POLICY "addresses_own_all" ON public.addresses FOR ALL USING ("userId" = auth.uid());

-- Notifications: anon CRUD (admin), users view own
CREATE POLICY "notif_anon_all" ON public.notifications FOR ALL USING (true);
CREATE POLICY "notif_own_select" ON public.notifications FOR SELECT USING ("userId" = auth.uid());

-- Reviews: anon CRUD (admin), anyone view visible, users create
CREATE POLICY "reviews_anon_all" ON public.reviews FOR ALL USING (true);
CREATE POLICY "reviews_anyone_select_visible" ON public.reviews FOR SELECT USING ("isVisible" = true);
CREATE POLICY "reviews_own_insert" ON public.reviews FOR INSERT WITH CHECK ("userId" = auth.uid());

-- ============================================
-- STEP 4: Storage policies for anon (admin uploads)
-- ============================================
CREATE POLICY "storage_product_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "storage_product_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "storage_product_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
CREATE POLICY "storage_banner_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "storage_banner_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banner-images');
CREATE POLICY "storage_banner_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'banner-images');
CREATE POLICY "storage_user_avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "storage_user_avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
