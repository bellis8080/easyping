-- Create storage bucket for ping attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ping-attachments', 'ping-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated users can upload ping attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ping-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Allow users to view attachments for pings they have access to
CREATE POLICY "Users can view ping attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ping-attachments'
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ping-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
