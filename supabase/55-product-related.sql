-- product_related: manually curated related products for each product
-- Admin picks which products appear in "قد يعجبك ايضا" for each product

CREATE TABLE IF NOT EXISTS public.product_related (
  id text PRIMARY KEY DEFAULT ('pr_' || encode(gen_random_bytes(8), 'hex')),
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "relatedProductId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("productId", "relatedProductId")
);

CREATE INDEX IF NOT EXISTS idx_product_related_product ON public.product_related("productId");
CREATE INDEX IF NOT EXISTS idx_product_related_target ON public.product_related("relatedProductId");

-- Permissions
GRANT SELECT ON public.product_related TO anon;
GRANT SELECT ON public.product_related TO authenticated;
GRANT ALL ON public.product_related TO service_role;

-- RLS
ALTER TABLE public.product_related ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_related_public_select" ON public.product_related
  FOR SELECT USING (true);

CREATE POLICY "product_related_admin_all" ON public.product_related
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );
