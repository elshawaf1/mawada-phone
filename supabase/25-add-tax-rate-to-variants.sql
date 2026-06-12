-- Mawada Phone - 25. ADD TAX RATE TO PRODUCT VARIANTS
-- ============================================
-- Add taxRate column to product_variants table

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS "taxRate" numeric DEFAULT 0;

COMMENT ON COLUMN public.product_variants."taxRate" IS 'Tax rate percentage for this variant (e.g., 14 for 14% VAT). Used for display purposes.';