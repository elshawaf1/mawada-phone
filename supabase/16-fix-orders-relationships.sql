-- ============================================
-- 16-fix-orders-relationships.sql
-- Run this in Supabase Dashboard SQL Editor
--
-- 1. Adds FK from orders."addressId" to addresses.id
-- 2. Adds anon_all policy for addresses (admin read)
-- 3. Grants anon role table-level access to addresses
-- ============================================

-- STEP 1: Grant table-level permissions to anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO anon;

-- STEP 2: Add FK from orders."addressId" to addresses.id
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_addressId_fkey,
  ADD CONSTRAINT orders_addressId_fkey
    FOREIGN KEY ("addressId") REFERENCES public.addresses(id)
    ON DELETE SET NULL;

-- STEP 3: Drop the restrictive addresses_own_all policy
DROP POLICY IF EXISTS "addresses_own_all" ON public.addresses;

-- STEP 4: Create permissive policy for anon (admin dashboard)
-- and a restrictive policy for authenticated users
CREATE POLICY "addresses_anon_all" ON public.addresses
  FOR ALL USING (true);

CREATE POLICY "addresses_own_all" ON public.addresses
  FOR ALL USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- STEP 5: Verify FK was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_addressId_fkey'
      AND table_name = 'orders'
  ) THEN
    RAISE WARNING 'FK orders_addressId_fkey was not created';
  END IF;
END $$;
