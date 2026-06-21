-- Create admin user: mawada2026@gmail.com / adminmawada
-- 
-- IMPORTANT: Do NOT insert directly into auth.users via SQL!
-- Supabase auth requires internal triggers that SQL inserts bypass.
--
-- USE THIS INSTEAD:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
--    Email: mawada2026@gmail.com
--    Password: adminmawada
--    Auto Confirm User: ✅
--
-- 2. Then run this SQL to set ADMIN role:
UPDATE public.profiles SET role = 'ADMIN' WHERE email = 'mawada2026@gmail.com';

-- Also promote any existing admin emails to ADMIN role (fallback)
UPDATE public.profiles SET role = 'ADMIN'
WHERE email IN (
  'elshawaf@mawadaphone.com',
  'admin@mawadaphone.com',
  'mawada2026@gmail.com'
);
