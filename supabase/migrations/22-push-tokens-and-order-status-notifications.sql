-- 22-push-tokens-and-order-status-notifications.sql
-- Adds push token storage, an optional orderId column on notifications,
-- and a trigger that writes a "type=order" notification whenever an order
-- changes status (PENDING -> CONFIRMED/PROCESSING/SHIPPED/DELIVERED/CANCELLED).

-- ============================================
-- 1. PUSH_TOKENS TABLE
-- ============================================
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
CREATE POLICY "Users manage own tokens" ON public.push_tokens
  FOR ALL
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

DROP POLICY IF EXISTS "Service role reads push tokens" ON public.push_tokens;
CREATE POLICY "Service role reads push tokens" ON public.push_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. NOTIFICATIONS: OPTIONAL orderId COLUMN
-- ============================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS "orderId" text;

CREATE INDEX IF NOT EXISTS idx_notifications_order
  ON public.notifications ("orderId")
  WHERE "orderId" IS NOT NULL;

-- ============================================
-- 3. ORDER STATUS -> NOTIFICATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_title_ar text;
  v_body text;
  v_body_ar text;
  v_short_order text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_title := 'Order placed';
    v_title_ar := 'تم استلام طلبك';
    v_body := 'Your order ' || NEW."orderNumber" || ' has been received and is being reviewed.';
    v_body_ar := 'طلبك رقم ' || NEW."orderNumber" || ' تم استلامه وجاري مراجعته.';
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_short_order := NEW."orderNumber";
      CASE NEW.status
        WHEN 'CONFIRMED' THEN
          v_title := 'Order confirmed';
          v_title_ar := 'تم تأكيد الطلب';
          v_body := 'Your order ' || v_short_order || ' has been confirmed.';
          v_body_ar := 'تم تأكيد طلبك رقم ' || v_short_order || '.';
        WHEN 'PROCESSING' THEN
          v_title := 'Order being prepared';
          v_title_ar := 'جاري تجهيز الطلب';
          v_body := 'Your order ' || v_short_order || ' is being prepared.';
          v_body_ar := 'طلبك رقم ' || v_short_order || ' قيد التجهيز.';
        WHEN 'SHIPPED' THEN
          v_title := 'Order shipped';
          v_title_ar := 'تم شحن الطلب';
          v_body := 'Your order ' || v_short_order || ' is on the way.';
          v_body_ar := 'طلبك رقم ' || v_short_order || ' في الطريق إليك.';
        WHEN 'DELIVERED' THEN
          v_title := 'Order delivered';
          v_title_ar := 'تم تسليم الطلب';
          v_body := 'Your order ' || v_short_order || ' has been delivered. Thank you!';
          v_body_ar := 'تم تسليم طلبك رقم ' || v_short_order || '. شكراً لتعاملك معنا.';
        WHEN 'CANCELLED' THEN
          v_title := 'Order cancelled';
          v_title_ar := 'تم إلغاء الطلب';
          v_body := 'Your order ' || v_short_order || ' has been cancelled.';
          v_body_ar := 'تم إلغاء طلبك رقم ' || v_short_order || '.';
        ELSE
          RETURN NEW;
      END CASE;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications ("userId", title, "titleAr", body, "bodyAr", type, "orderId", "isRead")
  VALUES (
    NEW."userId",
    v_title,
    v_title_ar,
    v_body,
    v_body_ar,
    'order',
    NEW.id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
