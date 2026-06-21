-- Add orderId column to notifications if missing
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "orderId" text;
