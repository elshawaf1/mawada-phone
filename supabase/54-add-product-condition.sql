-- Add condition column to products table
-- Values: 'new' (جديد) or 'used' (مستعمل)
-- Default is 'new' so existing products are treated as new

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new';

COMMENT ON COLUMN public.products.condition IS 'Product condition: new or used (جديد / مستعمل)';

-- Index already exists from migration 52, but ensure it covers the new column
CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);

-- Grant permissions
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
