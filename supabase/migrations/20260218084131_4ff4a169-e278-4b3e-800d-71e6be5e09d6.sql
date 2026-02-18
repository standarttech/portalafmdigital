
-- Make chat-images bucket private (non-public)
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

-- Allow only authenticated users to view chat images
CREATE POLICY "Authenticated users view chat images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images');
