-- ============================================
-- 21-orders-delete-policy.sql
-- Allow users to delete their own orders from the mobile app.
-- order_items cascade on delete (per 2-create-schema.sql:200).
-- orderitems_anon_all in 6-fix-everything.sql:125 already permits the
-- cascade delete on order_items.
-- ============================================

DROP POLICY IF EXISTS "orders_own_delete" ON public.orders;
CREATE POLICY "orders_own_delete" ON public.orders
FOR DELETE USING ("userId" = auth.uid());
