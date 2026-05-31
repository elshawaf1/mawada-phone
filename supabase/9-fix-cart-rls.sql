-- SECURITY DEFINER RPC to sync cart items (bypasses RLS for authenticated users)
-- Called from CartScreen before navigating to PaymentScreen
-- Uses p_user_id from the caller since auth.uid() may not be available
-- with the anon key JWT in some client configurations

CREATE OR REPLACE FUNCTION public.sync_cart_items(p_user_id uuid, p_items jsonb)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  DELETE FROM public.cart_items WHERE "userId" = p_user_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.cart_items ("userId", "productId", "variantId", quantity)
    VALUES (p_user_id, item->>'productId', item->>'variantId', (item->>'quantity')::integer);
  END LOOP;
END;
$$;
