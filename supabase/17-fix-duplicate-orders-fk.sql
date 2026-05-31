-- ============================================
-- 17-fix-duplicate-orders-fk.sql
-- Run this in Supabase Dashboard SQL Editor
--
-- Fixes: "can not embed because more than one
-- relationship between profile and order"
--
-- Root cause: migrations 11 and 13 created
-- duplicate FK constraints on orders.userId
-- due to PG auto-naming vs explicit naming.
-- Supabase's schema cache sees >1 FK and
-- cannot determine which join to use.
--
-- This migration:
-- 1. Dynamically drops ALL FK constraints
--    on orders.userId -> profiles.id
-- 2. Re-creates exactly one clean FK with
--    ON DELETE CASCADE
-- 3. Refreshes Supabase schema cache
-- ============================================

-- STEP 1: Grant table access (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;

-- STEP 2: Dynamically find and drop ALL FK constraints
-- from orders.userId to profiles.id, regardless of name
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'orders'
      AND con.contype = 'f'
      AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', rec.conname);
    RAISE NOTICE 'Dropped FK constraint: %', rec.conname;
  END LOOP;
END $$;

-- STEP 3: Re-create a single clean FK with CASCADE
ALTER TABLE public.orders
  ADD CONSTRAINT orders_userId_fkey
  FOREIGN KEY ("userId") REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- STEP 4: Verify exactly one FK exists
DO $$
DECLARE
  fk_count integer;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'orders'
    AND con.contype = 'f'
    AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));

  IF fk_count = 1 THEN
    RAISE NOTICE 'OK: Exactly 1 FK constraint on orders -> profiles';
  ELSE
    RAISE EXCEPTION 'FAIL: Expected 1 FK, found %', fk_count;
  END IF;
END $$;

-- STEP 5: Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
