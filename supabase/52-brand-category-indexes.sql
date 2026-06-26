-- 52. BRAND-CATEGORY PERFORMANCE INDEXES
-- Composite indexes for faster filtered product queries

-- Composite index for brand+category+condition product queries
CREATE INDEX IF NOT EXISTS idx_products_category_brand_condition
  ON public.products("categoryId", "brandId", condition)
  WHERE "isActive" = true;

-- Composite index for brand_categories lookups (brand -> categories)
CREATE INDEX IF NOT EXISTS idx_brand_categories_composite
  ON public.brand_categories("brandId", "categoryId");
