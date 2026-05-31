-- Fix RLS for addresses table
-- Run this in Supabase SQL Editor
--
-- ROOT CAUSE: Missing GRANT for authenticated role.
-- All previous SQL files only grant to `anon`, but logged-in users
-- use the `authenticated` role. Table-level permission is checked
-- BEFORE RLS policies, so the INSERT was rejected.
--
-- FIX: SECURITY DEFINER RPC functions bypass RLS entirely.
-- The functions use p_user_id (passed from the app) instead of
-- auth.uid(), because auth.uid() does not reliably work inside
-- SECURITY DEFINER functions in this Supabase setup.

-- 1. Grant table-level permissions to both roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- 2. Drop any existing policies
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "addresses_own_all" ON public.addresses;

-- 3. Ensure RLS is enabled
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 4. Create proper policy with both USING and WITH CHECK
CREATE POLICY "addresses_own_all" ON public.addresses
  FOR ALL
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- 5. Create SECURITY DEFINER functions as a robust fallback
-- These run as the table owner, bypassing RLS entirely.
-- They use p_user_id from the app for all data operations,
-- because auth.uid() is unreliable inside SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.create_address(
  p_user_id uuid,
  p_label text,
  p_city text,
  p_street text,
  p_region text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_is_default boolean DEFAULT false
) RETURNS SETOF public.addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.addresses ("userId", label, city, street, region, phone, "isDefault")
  VALUES (p_user_id, p_label, p_city, p_street, p_region, p_phone, p_is_default)
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.create_address(uuid, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_address(uuid, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_address(uuid, text, text, text, text, text, boolean) TO anon;

CREATE OR REPLACE FUNCTION public.update_address(
  p_id text,
  p_user_id uuid DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_street text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_is_default boolean DEFAULT NULL
) RETURNS SETOF public.addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.addresses
  SET
    label = COALESCE(p_label, label),
    city = COALESCE(p_city, city),
    street = COALESCE(p_street, street),
    region = COALESCE(p_region, region),
    phone = COALESCE(p_phone, phone),
    "isDefault" = COALESCE(p_is_default, "isDefault")
  WHERE id = p_id AND "userId" = COALESCE(p_user_id, "userId")
  RETURNING *;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found or access denied';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_address(text, uuid, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_address(text, uuid, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_address(text, uuid, text, text, text, text, text, boolean) TO anon;

CREATE OR REPLACE FUNCTION public.get_addresses(
  p_user_id uuid
)
RETURNS SETOF public.addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.addresses
  WHERE "userId" = p_user_id
  ORDER BY "isDefault" DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_addresses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_addresses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_addresses(uuid) TO anon;

CREATE OR REPLACE FUNCTION public.delete_address(
  p_id text,
  p_user_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.addresses
  WHERE id = p_id AND "userId" = COALESCE(p_user_id, "userId");

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found or access denied';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_address(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_address(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_address(text, uuid) TO anon;
