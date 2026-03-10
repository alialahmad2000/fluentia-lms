-- ============================================================================
-- 004_storage_buckets.sql
-- Supabase Storage buckets and access policies for Fluentia LMS
-- ============================================================================
-- BUCKETS:
--   avatars      — public, profile pictures (200 KB max)
--   voice-notes  — private, student speaking submissions (5 MB max)
--   submissions  — private, assignment file uploads (10 MB max)
--   materials    — private, teaching materials from trainers (50 MB max)
--   recordings   — private, class recordings (500 MB max)
--   reports      — private, generated progress report PDFs (10 MB max)
--   backups      — private, system backups, service-role only (100 MB max)
-- ============================================================================


-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('voice-notes',  'voice-notes',  false, 5242880,   ARRAY['audio/webm', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/ogg']),
  ('submissions',  'submissions',  false, 10485760,  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'audio/webm', 'audio/mp4', 'audio/aac']),
  ('materials',    'materials',    false, 52428800,  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg']),
  ('recordings',   'recordings',   false, 524288000, ARRAY['video/mp4', 'audio/mpeg']),
  ('reports',      'reports',      false, 10485760,  ARRAY['application/pdf']),
  ('avatars',      'avatars',      true,  204800,    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('backups',      'backups',      false, 104857600, ARRAY['application/json']);


-- ============================================================================
-- 1. AVATARS — public bucket
-- ============================================================================
-- Anyone can read (public bucket handles this automatically).
-- Authenticated users can upload/update/delete their own avatar.
-- Path convention: {user_id}/avatar.{ext}

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- 2. VOICE-NOTES — private bucket
-- ============================================================================
-- Students upload to their own folder: {student_id}/*
-- Students can read their own files.
-- Trainers can read files from students in their groups.
-- Admin can read all.

CREATE POLICY "voice_notes_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (
      -- Student reads own voice notes
      (storage.foldername(name))[1] = auth.uid()::text
      -- Trainer reads voice notes from students in their groups
      OR (
        public.is_trainer()
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT s.id FROM public.students s
          WHERE s.group_id = ANY(public.get_trainer_group_ids())
        )
      )
      -- Admin reads all
      OR public.is_admin()
    )
  );

CREATE POLICY "voice_notes_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "voice_notes_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "voice_notes_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- ============================================================================
-- 3. SUBMISSIONS — private bucket
-- ============================================================================
-- Same pattern as voice-notes:
-- Students upload to their own folder: {student_id}/*
-- Students can read their own files.
-- Trainers can read files from students in their groups.
-- Admin can read all.

CREATE POLICY "submissions_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      -- Student reads own submissions
      (storage.foldername(name))[1] = auth.uid()::text
      -- Trainer reads submissions from students in their groups
      OR (
        public.is_trainer()
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT s.id FROM public.students s
          WHERE s.group_id = ANY(public.get_trainer_group_ids())
        )
      )
      -- Admin reads all
      OR public.is_admin()
    )
  );

CREATE POLICY "submissions_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "submissions_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "submissions_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- ============================================================================
-- 4. MATERIALS — private bucket
-- ============================================================================
-- Trainers and admin can upload/update/delete.
-- All authenticated users can read (students need access to teaching materials).

CREATE POLICY "materials_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "materials_insert_trainer"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials'
    AND (public.is_trainer() OR public.is_admin())
  );

CREATE POLICY "materials_update_trainer"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'materials'
    AND (public.is_trainer() OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'materials'
    AND (public.is_trainer() OR public.is_admin())
  );

CREATE POLICY "materials_delete_trainer"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'materials'
    AND (public.is_trainer() OR public.is_admin())
  );


-- ============================================================================
-- 5. RECORDINGS — private bucket
-- ============================================================================
-- Trainers and admin can upload/update/delete.
-- All authenticated users can read (students access class recordings).

CREATE POLICY "recordings_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'recordings');

CREATE POLICY "recordings_insert_trainer"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND (public.is_trainer() OR public.is_admin())
  );

CREATE POLICY "recordings_update_trainer"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (public.is_trainer() OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'recordings'
    AND (public.is_trainer() OR public.is_admin())
  );

CREATE POLICY "recordings_delete_trainer"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (public.is_trainer() OR public.is_admin())
  );


-- ============================================================================
-- 6. REPORTS — private bucket
-- ============================================================================
-- Service role (server-side) creates reports — no INSERT policy needed for
-- regular users since service role bypasses RLS.
-- Students can read their own reports (path: {student_id}/...).
-- Trainers can read reports for students in their groups.
-- Admin can read all.

CREATE POLICY "reports_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND (
      -- Student reads own reports
      (storage.foldername(name))[1] = auth.uid()::text
      -- Trainer reads reports for students in their groups
      OR (
        public.is_trainer()
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT s.id FROM public.students s
          WHERE s.group_id = ANY(public.get_trainer_group_ids())
        )
      )
      -- Admin reads all
      OR public.is_admin()
    )
  );

-- No INSERT/UPDATE/DELETE policies for regular users.
-- Reports are created by the service role (server-side), which bypasses RLS.
-- Admin can delete reports if needed.
CREATE POLICY "reports_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.is_admin()
  );


-- ============================================================================
-- 7. BACKUPS — private bucket
-- ============================================================================
-- Only the service role can read/write backups.
-- No RLS policies for regular authenticated users.
-- The service role bypasses RLS entirely, so no policies are needed.
-- ============================================================================

-- (No policies created — service role access only)


-- ============================================================================
-- END OF STORAGE POLICIES
-- ============================================================================
