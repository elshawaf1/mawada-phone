-- Bundle Items: per-product custom pricing and naming within bundles
-- Idempotent migration — safe to re-run

CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY DEFAULT 'bi_' || encode(gen_random_bytes(8), 'hex'),
  bundle_id TEXT NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'addon' CHECK (role IN ('main', 'addon')),
  custom_name TEXT,
  custom_price NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_product ON bundle_items(product_id);

GRANT SELECT ON bundle_items TO anon;
GRANT SELECT ON bundle_items TO authenticated;
GRANT ALL ON bundle_items TO service_role;

ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Bundle items viewable by everyone" ON bundle_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage bundle items" ON bundle_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migrate existing data: main_product_id → bundle_items with role='main'
INSERT INTO bundle_items (bundle_id, product_id, role, sort_order)
SELECT id, main_product_id, 'main', 0
FROM product_bundles
WHERE NOT EXISTS (
  SELECT 1 FROM bundle_items bi WHERE bi.bundle_id = product_bundles.id AND bi.product_id = product_bundles.main_product_id
)
ON CONFLICT (bundle_id, product_id) DO NOTHING;

-- Migrate existing addon_product_ids → bundle_items with role='addon'
INSERT INTO bundle_items (bundle_id, product_id, role, sort_order)
SELECT pb.id, aid.product_id, 'addon', aid.ordinality
FROM product_bundles pb
CROSS JOIN LATERAL unnest(pb.addon_product_ids) WITH ORDINALITY AS aid(product_id, ordinality)
WHERE pb.addon_product_ids IS NOT NULL AND array_length(pb.addon_product_ids, 1) > 0
AND NOT EXISTS (
  SELECT 1 FROM bundle_items bi
  WHERE bi.bundle_id = pb.id AND bi.product_id = aid.product_id
)
ON CONFLICT (bundle_id, product_id) DO NOTHING;
