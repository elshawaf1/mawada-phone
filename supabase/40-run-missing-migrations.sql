-- Run this SINGLE query in Supabase Dashboard → SQL Editor
-- It creates: push_tokens, coupons, and adds orderId to notifications

-- 1. Add orderId column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "orderId" text;
CREATE INDEX IF NOT EXISTS idx_notifications_order ON public.notifications ("orderId") WHERE "orderId" IS NOT NULL;

-- 2. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens ("userId");
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tokens" ON public.push_tokens;
CREATE POLICY "Users manage own tokens" ON public.push_tokens FOR ALL USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());
DROP POLICY IF EXISTS "Service role reads push tokens" ON public.push_tokens;
CREATE POLICY "Service role reads push tokens" ON public.push_tokens FOR SELECT USING (auth.role() = 'service_role');

-- 3. Create coupons table
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
GRANT ALL PRIVILEGES ON public.coupons TO service_role;
INSERT INTO public.coupons (code, "discountPercent", "maxUses", "minOrderAmount", "expiresAt")
VALUES ('SAVE10', 10, 100, 0, '2026-12-31T23:59:59Z'),
       ('WELCOME5', 5, 1000, 0, '2026-12-31T23:59:59Z'),
       ('MAWADA20', 20, 50, 50000, '2026-12-31T23:59:59Z')
ON CONFLICT (code) DO NOTHING;

-- 4. Create order status notification trigger
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title text; v_title_ar text; v_body text; v_body_ar text; v_short_order text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_title := 'Order placed'; v_title_ar := 'تم استلام طلبك';
    v_body := 'Your order ' || NEW."orderNumber" || ' has been received.';
    v_body_ar := 'طلبك رقم ' || NEW."orderNumber" || ' تم استلامه وجاري مراجعته.';
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_short_order := NEW."orderNumber";
      CASE NEW.status
        WHEN 'CONFIRMED' THEN v_title := 'Order confirmed'; v_title_ar := 'تم تأكيد الطلب';
          v_body := 'Your order ' || v_short_order || ' has been confirmed.';
          v_body_ar := 'تم تأكيد طلبك رقم ' || v_short_order || '.';
        WHEN 'PROCESSING' THEN v_title := 'Order being prepared'; v_title_ar := 'جاري تجهيز الطلب';
          v_body := 'Your order ' || v_short_order || ' is being prepared.';
          v_body_ar := 'طلبك رقم ' || v_short_order || ' قيد التجهيز.';
        WHEN 'SHIPPED' THEN v_title := 'Order shipped'; v_title_ar := 'تم شحن الطلب';
          v_body := 'Your order ' || v_short_order || ' is on the way.';
          v_body_ar := 'طلبك رقم ' || v_short_order || ' في الطريق إليك.';
        WHEN 'DELIVERED' THEN v_title := 'Order delivered'; v_title_ar := 'تم تسليم الطلب';
          v_body := 'Your order ' || v_short_order || ' has been delivered.';
          v_body_ar := 'تم تسليم طلبك رقم ' || v_short_order || '.';
        WHEN 'CANCELLED' THEN v_title := 'Order cancelled'; v_title_ar := 'تم إلغاء الطلب';
          v_body := 'Your order ' || v_short_order || ' has been cancelled.';
          v_body_ar := 'تم إلغاء طلبك رقم ' || v_short_order || '.';
        ELSE RETURN NEW;
      END CASE;
    ELSE RETURN NEW; END IF;
  ELSE RETURN NEW; END IF;

  INSERT INTO public.notifications ("userId", title, "titleAr", body, "bodyAr", type, "orderId", "isRead")
  VALUES (NEW."userId", v_title, v_title_ar, v_body, v_body_ar, 'order', NEW.id, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
