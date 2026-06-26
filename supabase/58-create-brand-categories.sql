-- 58. BRAND-CATEGORIES JUNCTION TABLE
-- Links brands to specific categories (which brands appear in which categories)

CREATE TABLE IF NOT EXISTS public.brand_categories (
  "brandId"    text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  "categoryId" text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  "createdAt"  timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("brandId", "categoryId")
);

-- RLS
ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand_categories"
  ON public.brand_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage brand_categories"
  ON public.brand_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Index (migration 52 referenced this but table didn't exist)
CREATE INDEX IF NOT EXISTS idx_brand_categories_composite
  ON public.brand_categories("brandId", "categoryId");

-- Grants
GRANT SELECT ON public.brand_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_categories TO authenticated;
