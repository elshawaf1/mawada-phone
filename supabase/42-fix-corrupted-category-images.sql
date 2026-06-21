-- Run in Supabase Dashboard → SQL Editor
-- Cleans up SQL text that was accidentally saved as category image URLs

UPDATE public.categories SET "homeImageUrl" = NULL WHERE "homeImageUrl" LIKE '-- %';
UPDATE public.categories SET "searchImageUrl" = NULL WHERE "searchImageUrl" LIKE '-- %';

-- Also clean any other corrupted values
UPDATE public.categories SET "homeImageUrl" = NULL WHERE length("homeImageUrl") > 500;
UPDATE public.categories SET "searchImageUrl" = NULL WHERE length("searchImageUrl") > 500;
