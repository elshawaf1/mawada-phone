-- ============================================
-- 12-fix-auth-grants.sql
-- Run this in Supabase Dashboard SQL Editor
-- Fixes: "permission denied for table profiles"
-- when logged-in users (role: authenticated)
-- try to read/write data.
--
-- Previous SQL files (7-fix-admin-permissions)
-- only granted TO anon. Mobile users send
-- requests with their JWT (role: authenticated)
-- which needs its own GRANTs.
-- ============================================

-- Profiles: login reads, register writes, admin checks role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Products: browse, search
GRANT SELECT ON public.products TO authenticated;

-- Product variants: view options
GRANT SELECT ON public.product_variants TO authenticated;

-- Product images: view gallery
GRANT SELECT ON public.product_images TO authenticated;

-- Categories: browse
GRANT SELECT ON public.categories TO authenticated;

-- Brands: browse
GRANT SELECT ON public.brands TO authenticated;

-- Banners: homepage
GRANT SELECT ON public.banners TO authenticated;

-- Branches: delivery locations
GRANT SELECT ON public.branches TO authenticated;

-- Specifications: product details
GRANT SELECT ON public.specifications TO authenticated;

-- Cart items: sync during checkout
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- Wishlist: manage favorites
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;

-- Orders: create, view
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Order items: create, view
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- Addresses: manage delivery addresses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- Notifications: view
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Reviews: create, view
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
