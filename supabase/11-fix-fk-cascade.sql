-- ============================================
-- 11-fix-fk-cascade.sql
-- Run this in Supabase Dashboard SQL Editor
-- Fixes: "unable to delete rows as one of them
-- is currently referenced by a foreign key constraint"
--
-- When a user is deleted from auth.users, the
-- ON DELETE CASCADE on profiles.id deletes the
-- profile row. But orders and reviews lacked
-- ON DELETE CASCADE, blocking the cascade.
-- ============================================

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_userId_fkey,
  ADD CONSTRAINT reviews_userId_fkey
    FOREIGN KEY ("userId") REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_userId_fkey,
  ADD CONSTRAINT orders_userId_fkey
    FOREIGN KEY ("userId") REFERENCES public.profiles(id)
    ON DELETE CASCADE;
