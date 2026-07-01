-- 64-notification-push-trigger.sql
-- AFTER INSERT trigger on notifications table
-- Sends push notifications for system-triggered notifications (sentBy IS NULL)
-- Skips admin broadcasts (sentBy IS NOT NULL) since notification-broadcast handles push
-- Uses pg_net to call send-push edge function (fire-and-forget)

-- ============================================
-- 1. TRIGGER FUNCTION: Send push on notification insert
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send push for system-triggered notifications (order status, payment status)
  -- Admin broadcasts already send push via notification-broadcast edge function
  IF NEW."sentBy" IS NULL THEN
    PERFORM net.http_post(
      url := 'https://hwhnskouvcwiufczxhek.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'userId', NEW."userId",
        'title', COALESCE(NEW."titleAr", NEW.title),
        'body', COALESCE(NEW."bodyAr", NEW.body),
        'type', NEW.type,
        'orderId', NEW."orderId",
        'notifId', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trg_notify_push_on_insert ON public.notifications;
CREATE TRIGGER trg_notify_push_on_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_insert();
