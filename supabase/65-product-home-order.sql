-- Add homeOrder column to products table
-- NULL = product does NOT appear on home screen (default)
-- 1, 2, 3... = product appears on home, ordered by this number

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "homeOrder" integer DEFAULT NULL;

COMMENT ON COLUMN public.products."homeOrder" IS 'Controls home screen display order. NULL = hidden from home. 1, 2, 3... = position on home screen (ASC).';

-- Index for fast home screen queries
CREATE INDEX IF NOT EXISTS idx_products_home_order ON public.products("homeOrder") WHERE "homeOrder" IS NOT NULL;

-- Ensure permissions
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
