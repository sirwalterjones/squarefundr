-- Setup Supabase Storage for SquareFundr
-- Run this in your Supabase SQL Editor

-- Create the images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for images bucket
CREATE POLICY "Anyone can view campaign images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload campaign images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own campaign images" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own campaign images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
); 