-- Add showRelatedProducts toggle to products table
-- When true: show curated related products in "قد يعجبك ايضا"
-- When false: hide the section entirely

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "showRelatedProducts" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products."showRelatedProducts" IS 'Show curated related products section on product detail page';

-- Default existing products to false so the section only shows when admin explicitly enables it
UPDATE public.products SET "showRelatedProducts" = false WHERE "showRelatedProducts" IS NULL;

-- Permissions
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
