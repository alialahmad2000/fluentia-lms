-- GOD COMM Phase G1: RLS gap closure
-- Adds missing message_reactions policies + storage.objects policies for 3 chat buckets

-- ── message_reactions (0 policies → 3 policies) ───────────────────────────────
CREATE POLICY "reactions_select_in_group" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_messages m
      WHERE m.id = message_id
        AND public.is_in_group(m.group_id)
    )
  );

CREATE POLICY "reactions_insert_self" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_messages m
      WHERE m.id = message_id
        AND public.is_in_group(m.group_id)
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "reactions_delete_self" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- ── storage.objects: chat-voice (3 policies) ──────────────────────────────────
-- Path: chat-voice/<group_id>/<user_id>/<uuid>.<ext>
CREATE POLICY "chat_voice_read_in_group" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-voice'
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_voice_insert_self_in_group" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-voice'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_voice_delete_self" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-voice'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ── storage.objects: chat-files (3 policies) ──────────────────────────────────
CREATE POLICY "chat_files_read_in_group" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-files'
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_files_insert_self_in_group" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_files_delete_self" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ── storage.objects: chat-images (3 policies) ─────────────────────────────────
CREATE POLICY "chat_images_read_in_group" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-images'
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_images_insert_self_in_group" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.is_in_group( (storage.foldername(name))[1]::uuid )
  );

CREATE POLICY "chat_images_delete_self" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
