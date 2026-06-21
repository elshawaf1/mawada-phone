-- Add costPrice (purchase/supplier price) to products, variants, and order_items
-- This enables COGS and Gross Profit calculations

-- Products: what you paid the supplier
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "costPrice" numeric NOT NULL DEFAULT 0;

-- Variants: different variants may have different cost prices
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS "costPrice" numeric NOT NULL DEFAULT 0;

-- Order items: snapshot cost at time of order for historical accuracy
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "costPrice" numeric NOT NULL DEFAULT 0;
