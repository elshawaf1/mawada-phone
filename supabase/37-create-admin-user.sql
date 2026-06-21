-- Create admin user: mawada2026@gmail.com / adminmawada
-- Run this in Supabase SQL Editor

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert into auth.users (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mawada2026@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'mawada2026@gmail.com',
      crypt('adminmawada', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin","role":"ADMIN"}'::jsonb
    );
  END IF;
END $$;

-- Insert admin profile with ADMIN role
INSERT INTO public.profiles (id, name, email, phone, role, "createdAt", "updatedAt")
SELECT
  id,
  'Admin',
  'mawada2026@gmail.com',
  '',
  'ADMIN',
  now(),
  now()
FROM auth.users
WHERE email = 'mawada2026@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Also promote any existing admin emails to ADMIN role (fallback)
UPDATE public.profiles SET role = 'ADMIN'
WHERE email IN (
  'elshawaf@mawadaphone.com',
  'admin@mawadaphone.com',
  'mawada2026@gmail.com'
);
