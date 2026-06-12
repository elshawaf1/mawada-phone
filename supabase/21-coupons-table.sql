-- ============================================
-- 21-coupons-table.sql
-- Server-side coupon validation table (H3)
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id text PRIMARY KEY DEFAULT ('cpn_' || encode(gen_random_bytes(8), 'hex')),
  code text UNIQUE NOT NULL,
  "discountPercent" integer NOT NULL CHECK ("discountPercent" > 0 AND "discountPercent" <= 100),
  "maxUses" integer DEFAULT 0,
  "currentUses" integer DEFAULT 0,
  "minOrderAmount" numeric DEFAULT 0,
  "expiresAt" timestamp,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) needs full access
GRANT ALL PRIVILEGES ON public.coupons TO service_role;

-- Seed data
INSERT INTO public.coupons (code, "discountPercent", "maxUses", "minOrderAmount", "expiresAt")
VALUES
  ('SAVE10', 10, 100, 0, '2026-12-31T23:59:59Z'),
  ('WELCOME5', 5, 1000, 0, '2026-12-31T23:59:59Z'),
  ('MAWADA20', 20, 50, 50000, '2026-12-31T23:59:59Z')
ON CONFLICT (code) DO NOTHING;
