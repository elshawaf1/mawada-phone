-- ============================================
-- 5-fix-admin-rls.sql
-- Adds anon-friendly RLS policies so the admin
-- dashboard (no auth) can perform CRUD via the
-- anon key.
-- Mobile authenticated users keep their own
-- restrictive policies (cart, orders, etc.).
-- ============================================

-- Profiles: anon needs SELECT for admin dashboard stats
CREATE POLICY "Anon view profiles" ON public.profiles FOR SELECT USING (true);

-- Products: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage products" ON public.products FOR ALL USING (true);

-- Categories: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage categories" ON public.categories FOR ALL USING (true);

-- Brands: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage brands" ON public.brands FOR ALL USING (true);

-- Banners: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage banners" ON public.banners FOR ALL USING (true);

-- Branches: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage branches" ON public.branches FOR ALL USING (true);

-- Product Images: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage product images" ON public.product_images FOR ALL USING (true);

-- Product Variants: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage product variants" ON public.product_variants FOR ALL USING (true);

-- Specifications: anon can do everything (admin CRUD)
CREATE POLICY "Anon manage specifications" ON public.specifications FOR ALL USING (true);

-- Orders: anon can view and update (admin view/update orders)
CREATE POLICY "Anon manage orders" ON public.orders FOR ALL USING (true);

-- Order Items: anon can view and update (admin view/update order items)
CREATE POLICY "Anon manage order items" ON public.order_items FOR ALL USING (true);

-- Notifications: anon can do everything (admin create notifications)
CREATE POLICY "Anon manage notifications" ON public.notifications FOR ALL USING (true);

-- Reviews: anon can view and update (admin manage reviews)
CREATE POLICY "Anon manage reviews" ON public.reviews FOR ALL USING (true);

-- ============================================
-- Storage Policies for Anon (admin)
-- ============================================

-- Product images: anon can upload
CREATE POLICY "Anon upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Product images: anon can delete
CREATE POLICY "Anon delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- Banner images: anon can upload
CREATE POLICY "Anon upload banner images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banner-images');

-- Banner images: anon can delete
CREATE POLICY "Anon delete banner images" ON storage.objects FOR DELETE USING (bucket_id = 'banner-images');
