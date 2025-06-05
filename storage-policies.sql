-- Storage Policies for SquareFundr Images
-- Run this AFTER running final-setup.sql

-- Enable RLS on storage.objects (safe if already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public-read-images" ON storage.objects;
DROP POLICY IF EXISTS "auth-upload-images" ON storage.objects;
DROP POLICY IF EXISTS "auth-update-own-images" ON storage.objects;
DROP POLICY IF EXISTS "auth-delete-own-images" ON storage.objects;

-- Policy 1: Allow public read access to images
CREATE POLICY "public-read-images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Policy 2: Allow authenticated users to upload images
CREATE POLICY "auth-upload-images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy 3: Allow users to update their own images
CREATE POLICY "auth-update-own-images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 4: Allow users to delete their own images
CREATE POLICY "auth-delete-own-images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]); 