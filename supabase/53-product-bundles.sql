-- Product Bundles: "Complete Your Setup" feature
-- Idempotent migration — safe to re-run

CREATE TABLE IF NOT EXISTS product_bundles (
  id TEXT PRIMARY KEY DEFAULT 'bundle_' || encode(gen_random_bytes(8), 'hex'),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  main_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_product_ids TEXT[] NOT NULL DEFAULT '{}',
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_bundles_main_product ON product_bundles(main_product_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_active ON product_bundles(is_active) WHERE is_active = true;

GRANT SELECT ON product_bundles TO anon;
GRANT SELECT ON product_bundles TO authenticated;
GRANT ALL ON product_bundles TO service_role;

ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Bundles are viewable by everyone" ON product_bundles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage bundles" ON product_bundles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_product_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_bundles_updated ON product_bundles;
CREATE TRIGGER on_product_bundles_updated
  BEFORE UPDATE ON product_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_product_bundles_updated_at();
