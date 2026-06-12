-- Mawada Phone - 27. FIX RLS POLICIES FOR PUBLIC READ ACCESS
-- ============================================
-- Fix migration 20 issues: products, categories, banners, brands, branches not visible

-- 1. Fix profile creation trigger
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);

-- 2. Ensure anon has SELECT grants on all public-read tables
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.branches TO anon;
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.specifications TO anon;
GRANT SELECT ON public.reviews TO anon;

-- 3. Ensure products policy allows reading active products
-- (Already exists but verify)
-- CREATE POLICY "products_public_select" ON public.products FOR SELECT USING ("isActive" = true);

-- 4. Ensure categories policy allows reading active categories
-- CREATE POLICY "categories_public_select" ON public.categories FOR SELECT USING ("isActive" = true);

-- 5. Ensure banners policy allows reading active banners
-- CREATE POLICY "banners_public_select" ON public.banners FOR SELECT USING ("isActive" = true);

-- 6. Ensure brands policy allows reading active brands
-- CREATE POLICY "brands_public_select" ON public.brands FOR SELECT USING ("isActive" = true);

-- 7. Ensure branches policy allows reading active branches
-- CREATE POLICY "branches_public_select" ON public.branches FOR SELECT USING ("isActive" = true);

-- 8. Fix any NULL isActive in seed data - set to true
UPDATE public.products SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;
UPDATE public.categories SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;
UPDATE public.banners SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;
UPDATE public.brands SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;
UPDATE public.branches SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;