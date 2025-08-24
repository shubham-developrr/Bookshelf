-- Supabase Storage Setup for User Data Blob Sync
-- Execute these queries in the Supabase SQL editor

-- 1. Create storage bucket for user data (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-data', 
  'user-data', 
  false,  -- Private bucket
  52428800,  -- 50MB limit
  ARRAY['application/json']  -- Only allow JSON files
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policy: Users can only access their own folder
CREATE POLICY "Users can manage their own data" ON storage.objects
FOR ALL USING (
  bucket_id = 'user-data' 
  AND auth.uid()::text = split_part(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'user-data' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- 3. Allow authenticated users to access the bucket
CREATE POLICY "Authenticated users can access user-data bucket" ON storage.objects
FOR ALL USING (
  bucket_id = 'user-data' 
  AND auth.role() = 'authenticated'
);

-- 4. Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Create function to extract user ID from folder path
CREATE OR REPLACE FUNCTION extract_user_id_from_path(path text)
RETURNS uuid AS $$
BEGIN
  -- Extract user ID from path like 'user-{uuid}/filename.json'
  RETURN (regexp_match(path, '^user-([a-f0-9-]{36})'))[1]::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. More restrictive policy using the helper function
DROP POLICY IF EXISTS "Users can manage their own data" ON storage.objects;
CREATE POLICY "Users can manage their own user data" ON storage.objects
FOR ALL USING (
  bucket_id = 'user-data' 
  AND extract_user_id_from_path(name) = auth.uid()
)
WITH CHECK (
  bucket_id = 'user-data' 
  AND extract_user_id_from_path(name) = auth.uid()
);

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- 8. Create index for better performance on user data queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_user_data 
ON storage.objects (bucket_id, name) 
WHERE bucket_id = 'user-data';

-- Verify the setup with these queries:
-- SELECT * FROM storage.buckets WHERE id = 'user-data';
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';