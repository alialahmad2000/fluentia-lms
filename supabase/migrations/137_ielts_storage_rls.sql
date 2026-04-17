-- ════════════════════════════════════════════════════════════════
-- 137: IELTS Storage RLS Policies
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "ielts_speaking_student_insert" ON storage.objects;
CREATE POLICY "ielts_speaking_student_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ielts-speaking-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "ielts_speaking_student_read" ON storage.objects;
CREATE POLICY "ielts_speaking_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ielts-speaking-submissions'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer'))
    )
  );

DROP POLICY IF EXISTS "ielts_audio_authenticated_read" ON storage.objects;
CREATE POLICY "ielts_audio_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ielts-audio');

DROP POLICY IF EXISTS "ielts_audio_admin_write" ON storage.objects;
CREATE POLICY "ielts_audio_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ielts-audio'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'ielts-audio'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "ielts_writing_images_public_read" ON storage.objects;
CREATE POLICY "ielts_writing_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ielts-writing-images');

DROP POLICY IF EXISTS "ielts_writing_images_admin_write" ON storage.objects;
CREATE POLICY "ielts_writing_images_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ielts-writing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'ielts-writing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
