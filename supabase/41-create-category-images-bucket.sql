-- Create category-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated can upload category images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

-- Allow public read
CREATE POLICY "Public can read category images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'category-images');

-- Allow authenticated to delete
CREATE POLICY "Authenticated can delete category images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'category-images');
