-- Fix RLS policies: correct admin role check from lowercase 'admin' to 'ADMIN'

-- 1. product_bundles: fix admin policy
DROP POLICY IF EXISTS "Admins can manage bundles" ON product_bundles;
CREATE POLICY "Admins can manage bundles" ON product_bundles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- 2. bundle_items: fix admin policy
DROP POLICY IF EXISTS "Admins can manage bundle items" ON bundle_items;
CREATE POLICY "Admins can manage bundle items" ON bundle_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- 3. product_related: fix admin policy from USING (true) to proper role check
DROP POLICY IF EXISTS "product_related_admin_all" ON public.product_related;
CREATE POLICY "product_related_admin_all" ON public.product_related
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );
