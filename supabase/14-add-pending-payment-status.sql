-- ============================================
-- 14-add-pending-payment-status.sql
-- Fixes: "violates check constraint"
-- when Edge Functions insert paymentStatus='PENDING'
--
-- Dynamically finds and drops ALL check constraints
-- on orders."paymentStatus" regardless of name,
-- then adds the new one including 'PENDING'.
-- ============================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%"paymentStatus"%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', rec.conname);
    RAISE NOTICE 'Dropped constraint: %', rec.conname;
  END LOOP;
END $$;

ALTER TABLE public.orders ADD CONSTRAINT orders_paymentStatus_check
  CHECK ("paymentStatus" IN ('PENDING','UNPAID','PAID','REFUNDED','FAILED'));

-- Grant schema access to service_role (Edge Functions)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
