-- Storage Policies as Superuser - SquareFundr
-- Run this with maximum privileges

-- Become superuser temporarily  
SET ROLE postgres;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public-read-images" ON storage.objects;
DROP POLICY IF EXISTS "auth-upload-images" ON storage.objects; 
DROP POLICY IF EXISTS "auth-update-own-images" ON storage.objects;
DROP POLICY IF EXISTS "auth-delete-own-images" ON storage.objects;

-- Create storage policies
CREATE POLICY "public-read-images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

CREATE POLICY "auth-upload-images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "auth-update-own-images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "auth-delete-own-images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Grant policy usage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO service_role;

-- Reset to normal role
RESET ROLE; 