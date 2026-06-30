-- 62-order-items-sku.sql
-- Add sku and variant_name columns to order_items for snapshotting variant data at order time

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name text;
