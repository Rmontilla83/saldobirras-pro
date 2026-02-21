-- Run this in Supabase SQL Editor
-- Creates the 'photos' storage bucket for customer photos

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true);

-- Allow authenticated users to upload
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

-- Allow public read access
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'photos');

SELECT '✅ Photos bucket created' AS status;
