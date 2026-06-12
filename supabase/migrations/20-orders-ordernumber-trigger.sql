-- ============================================
-- 20-orders-ordernumber-trigger.sql
-- Generate "orderNumber" in the database via a trigger.
-- Format: or-XXXXXXX (10 chars total: "or-" + 7 random chars from A-Z0-9)
-- Fires BEFORE INSERT on public.orders; only sets the value when
-- "orderNumber" is null/empty so explicit values still work.
-- ============================================

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'or-';
  i INT;
BEGIN
  IF NEW."orderNumber" IS NULL OR NEW."orderNumber" = '' THEN
    FOR i IN 1..7 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    NEW."orderNumber" := result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_number();
