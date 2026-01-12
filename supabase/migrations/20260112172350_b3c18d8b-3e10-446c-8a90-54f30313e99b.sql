-- Create storage bucket for tenant assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow authenticated users to upload to their tenant folder
CREATE POLICY "Authenticated users can upload tenant assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
);

-- Storage policy: Allow public read access to tenant assets
CREATE POLICY "Public can view tenant assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

-- Storage policy: Allow authenticated users to update their tenant assets
CREATE POLICY "Authenticated users can update tenant assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-assets');

-- Storage policy: Allow authenticated users to delete their tenant assets
CREATE POLICY "Authenticated users can delete tenant assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-assets');