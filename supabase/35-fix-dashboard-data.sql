-- Make get_top_products run as superuser (bypass RLS)
-- This ensures the RPC works regardless of calling user's RLS permissions
CREATE OR REPLACE FUNCTION public.get_top_products(limit_count integer DEFAULT 5)
RETURNS TABLE (id text, "nameAr" text, name text, "soldCount" bigint)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p."nameAr", p.name, COALESCE(SUM(oi.quantity), 0)::bigint as "soldCount"
  FROM public.products p
  LEFT JOIN public.order_items oi ON oi."productId" = p.id
  LEFT JOIN public.orders o ON o.id = oi."orderId" AND o.status != 'CANCELLED'
  WHERE p."isActive" = true
  GROUP BY p.id, p."nameAr", p.name
  ORDER BY "soldCount" DESC
  LIMIT limit_count;
END;
$$;
