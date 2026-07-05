-- 68-product-collections.sql
-- Collections: organize products into named groups (admin-only organizational tool)
-- Does NOT affect mobile app

-- 1. Collections table
CREATE TABLE product_collections (
  id TEXT PRIMARY KEY DEFAULT 'coll_' || lower(hex(random_bytes(8))),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Collection items (junction table)
CREATE TABLE product_collection_items (
  id TEXT PRIMARY KEY DEFAULT 'ci_' || lower(hex(random_bytes(8))),
  collection_id TEXT NOT NULL REFERENCES product_collections(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- 3. Indexes
CREATE INDEX idx_collection_items_collection ON product_collection_items(collection_id);
CREATE INDEX idx_collection_items_product ON product_collection_items(product_id);

-- 4. RLS policies
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collection_items ENABLE ROW LEVEL SECURITY;

-- product_collections: everyone can SELECT, admins can ALL
CREATE POLICY "collections_select_public" ON product_collections FOR SELECT USING (true);
CREATE POLICY "collections_insert_admin" ON product_collections FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "collections_update_admin" ON product_collections FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "collections_delete_admin" ON product_collections FOR DELETE USING (auth.role() = 'service_role');

-- product_collection_items: everyone can SELECT, admins can ALL
CREATE POLICY "collection_items_select_public" ON product_collection_items FOR SELECT USING (true);
CREATE POLICY "collection_items_insert_admin" ON product_collection_items FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "collection_items_update_admin" ON product_collection_items FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "collection_items_delete_admin" ON product_collection_items FOR DELETE USING (auth.role() = 'service_role');

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_product_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_collections_updated_at
  BEFORE UPDATE ON product_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_product_collections_updated_at();

-- 6. Grant permissions
GRANT SELECT ON product_collections TO anon, authenticated;
GRANT ALL ON product_collections TO service_role;
GRANT SELECT ON product_collection_items TO anon, authenticated;
GRANT ALL ON product_collection_items TO service_role;
