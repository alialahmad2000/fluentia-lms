-- ============================================
-- 077: Fix voice-notes storage policies for admin impersonation
-- + update allowed MIME types to include codec variants
-- ============================================

-- 1. Add admin INSERT policy for voice-notes storage
CREATE POLICY "voice_notes_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND public.is_admin()
  );

-- 2. Add admin UPDATE policy for voice-notes storage
CREATE POLICY "voice_notes_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND public.is_admin()
  );

-- 3. Update allowed MIME types to include codec variants
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a'
]
WHERE id = 'voice-notes';
