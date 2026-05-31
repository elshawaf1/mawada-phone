-- ============================================
-- 13-fix-duplicate-fk.sql
-- Fixes: "more than one relationship was found
-- for 'reviews' and 'profiles'"
--
-- Root cause: 11-fix-fk-cascade.sql used
-- reviews_userId_fkey (uppercase I) but PG
-- auto-named the original reviews_userid_fkey
-- (lowercase). DROP IF EXISTS silently skipped
-- the wrong name, then ADD created a second FK.
-- ============================================

-- Drop the OLD auto-named lowercase constraint (without cascade)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_userid_fkey;

-- Drop the OLD auto-named lowercase constraint for orders too
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_userid_fkey;
