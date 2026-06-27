-- ============================================
-- TRIGGER: Notify on paymentStatus change (safety net)
-- Fires when paymentStatus changes to PAID or FAILED
-- Complements the existing trg_notify_order_status trigger
-- which fires on status changes (e.g. CONFIRMED)
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_title_ar text;
  v_body text;
  v_body_ar text;
  v_short_order text;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus") THEN
    v_short_order := NEW."orderNumber";

    CASE NEW."paymentStatus"
      WHEN 'PAID' THEN
        v_title := 'Payment received';
        v_title_ar := 'تم استلام الدفع';
        v_body := 'Payment for order ' || v_short_order || ' was received successfully.';
        v_body_ar := 'تم استلام دفع طلبك رقم ' || v_short_order || ' بنجاح.';
      WHEN 'FAILED' THEN
        v_title := 'Payment failed';
        v_title_ar := 'فشل الدفع';
        v_body := 'Payment for order ' || v_short_order || ' has failed.';
        v_body_ar := 'فشل الدفع لطلبك رقم ' || v_short_order || '.';
      ELSE
        RETURN NEW;
    END CASE;

    INSERT INTO public.notifications ("userId", title, "titleAr", body, "bodyAr", type, "orderId", "isRead")
    VALUES (
      NEW."userId",
      v_title,
      v_title_ar,
      v_body,
      v_body_ar,
      'payment',
      NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.orders;
CREATE TRIGGER trg_notify_payment_status
  AFTER UPDATE OF "paymentStatus" ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_status_change();
