-- FIX: Delete corrupted auth user created by raw SQL insert
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Delete the corrupted user from auth.users
DELETE FROM auth.users WHERE email = 'mawada2026@gmail.com';

-- Step 2: Delete any orphaned profile
DELETE FROM public.profiles WHERE email = 'mawada2026@gmail.com';

-- Step 3: Verify it's gone
SELECT id, email FROM auth.users WHERE email = 'mawada2026@gmail.com';
