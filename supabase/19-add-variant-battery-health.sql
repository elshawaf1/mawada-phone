-- Mawada Phone - 19. Add batteryHealth to product_variants
-- ============================================

ALTER TABLE public.product_variants
  ADD COLUMN "batteryHealth" integer DEFAULT NULL;

COMMENT ON COLUMN public.product_variants."batteryHealth" IS 'Battery health percentage (0-100), optional';
