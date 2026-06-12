-- Mawada Phone - 24. ADD TAX RATE TO PRODUCTS
-- ============================================
-- Add taxRate column to products table (display only, not used in payment calculations)

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "taxRate" numeric DEFAULT 0;

COMMENT ON COLUMN public.products."taxRate" IS 'Tax rate percentage for display purposes only (e.g., 14 for 14% VAT). Not used in payment calculations.';