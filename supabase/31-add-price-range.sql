-- 31. ADD PRICE RANGE TO PRODUCTS
-- Adds optional price range mode: when enabled, shows minPrice-maxPrice instead of basePrice

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS "usePriceRange" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "minPrice" numeric,
ADD COLUMN IF NOT EXISTS "maxPrice" numeric;
