ALTER TABLE categories ADD COLUMN IF NOT EXISTS "homeImageUrl" text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "searchImageUrl" text;
UPDATE categories SET "homeImageUrl" = "imageUrl", "searchImageUrl" = "imageUrl" WHERE "homeImageUrl" IS NULL;
