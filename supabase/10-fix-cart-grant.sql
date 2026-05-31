-- ============================================
-- 10-fix-cart-grant.sql
-- Run this in Supabase Dashboard SQL Editor
-- Fixes: "permission denied for table cart_items"
-- when logged-in users (role: authenticated)
-- try to insert cart items.
-- ============================================

-- Add authenticated role grants (user's JWT)
-- Previous SQL (7-fix-admin-permissions) only granted TO anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;

