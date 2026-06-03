-- Mawada Phone - 18. Add sentBy to notifications + admin policies
-- ============================================

-- Add sentBy column to track who sent the notification (admin user)
ALTER TABLE public.notifications ADD COLUMN "sentBy" uuid REFERENCES public.profiles(id);

-- Allow admins to SELECT all notifications (for history in admin dashboard)
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Allow admins to DELETE notifications
CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Allow admins to UPDATE any notification
CREATE POLICY "Admins can update notifications" ON public.notifications
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Grant permissions
GRANT ALL ON public.notifications TO anon, authenticated;
