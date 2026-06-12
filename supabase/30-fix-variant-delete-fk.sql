-- 30. FIX: Allow variant deletion - find and fix ALL FK constraints to product_variants

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'product_variants'
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      con.table_name, con.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY ("variantId") REFERENCES public.product_variants(id) ON DELETE SET NULL',
      con.table_name, con.constraint_name
    );
    RAISE NOTICE 'Fixed FK % on %', con.constraint_name, con.table_name;
  END LOOP;
END $$;
