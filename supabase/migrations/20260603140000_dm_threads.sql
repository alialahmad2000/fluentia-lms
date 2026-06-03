-- Direct Messages — route DMs through group_messages (via dm_thread_id) so they
-- reuse the full premium chat (voice/image/file/reactions/replies/bubbles).
-- Contactability: students ↔ same academic_level students, and anyone ↔ trainer/admin.

-- 1) Threads (one per unordered user pair)
CREATE TABLE IF NOT EXISTS dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_lo uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_hi uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_lo < user_hi),
  UNIQUE (user_lo, user_hi)
);
CREATE INDEX IF NOT EXISTS idx_dm_threads_lo ON dm_threads(user_lo, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_threads_hi ON dm_threads(user_hi, last_message_at DESC);

-- 2) group_messages carries an optional dm_thread_id (group_id already nullable)
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS dm_thread_id uuid REFERENCES dm_threads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gm_dm_thread_created ON group_messages(dm_thread_id, created_at DESC) WHERE deleted_at IS NULL;

-- 3) per-user read cursor
CREATE TABLE IF NOT EXISTS dm_thread_reads (
  thread_id uuid NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- 4) membership helper
CREATE OR REPLACE FUNCTION public.is_dm_member(p_thread uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM dm_threads t WHERE t.id = p_thread AND (t.user_lo = auth.uid() OR t.user_hi = auth.uid()))
$$;

-- 5) RLS
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_thread_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dm_threads_member_select ON dm_threads;
CREATE POLICY dm_threads_member_select ON dm_threads FOR SELECT USING (user_lo = auth.uid() OR user_hi = auth.uid());
DROP POLICY IF EXISTS dm_threads_service ON dm_threads;
CREATE POLICY dm_threads_service ON dm_threads FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS dm_reads_self ON dm_thread_reads;
CREATE POLICY dm_reads_self ON dm_thread_reads FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- group_messages DM access (permissive — OR'd with existing group policies)
DROP POLICY IF EXISTS gm_dm_select ON group_messages;
CREATE POLICY gm_dm_select ON group_messages FOR SELECT USING (dm_thread_id IS NOT NULL AND public.is_dm_member(dm_thread_id));
DROP POLICY IF EXISTS gm_dm_insert ON group_messages;
CREATE POLICY gm_dm_insert ON group_messages FOR INSERT WITH CHECK (dm_thread_id IS NOT NULL AND sender_id = auth.uid() AND public.is_dm_member(dm_thread_id));
DROP POLICY IF EXISTS gm_dm_update ON group_messages;
CREATE POLICY gm_dm_update ON group_messages FOR UPDATE USING (dm_thread_id IS NOT NULL AND sender_id = auth.uid());
DROP POLICY IF EXISTS gm_dm_delete ON group_messages;
CREATE POLICY gm_dm_delete ON group_messages FOR DELETE USING (dm_thread_id IS NOT NULL AND sender_id = auth.uid());

-- reactions in DMs
DROP POLICY IF EXISTS reactions_dm_select ON message_reactions;
CREATE POLICY reactions_dm_select ON message_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_messages m WHERE m.id = message_id AND m.dm_thread_id IS NOT NULL AND public.is_dm_member(m.dm_thread_id)));
DROP POLICY IF EXISTS reactions_dm_insert ON message_reactions;
CREATE POLICY reactions_dm_insert ON message_reactions FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM group_messages m WHERE m.id = message_id AND m.dm_thread_id IS NOT NULL AND public.is_dm_member(m.dm_thread_id) AND m.deleted_at IS NULL));

-- extend reaction emoji set (premium action sheet uses 🙏 etc.)
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS reactions_emoji_check;
ALTER TABLE message_reactions ADD CONSTRAINT reactions_emoji_check CHECK (emoji IN ('👍','🔥','❤️','😂','👏','🙏','😮','😢'));

-- 6) storage policies for DM media — path: dm/<thread_id>/<user_id>/<file>
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['chat-voice','chat-files','chat-images'] LOOP
    EXECUTE format($p$
      DROP POLICY IF EXISTS %1$I ON storage.objects;
      CREATE POLICY %1$I ON storage.objects FOR SELECT USING (
        bucket_id = %2$L AND (storage.foldername(name))[1] = 'dm'
        AND public.is_dm_member( ((storage.foldername(name))[2])::uuid ));
    $p$, b||'_dm_read', b);
    EXECUTE format($p$
      DROP POLICY IF EXISTS %1$I ON storage.objects;
      CREATE POLICY %1$I ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = %2$L AND (storage.foldername(name))[1] = 'dm'
        AND auth.uid()::text = (storage.foldername(name))[3]
        AND public.is_dm_member( ((storage.foldername(name))[2])::uuid ));
    $p$, b||'_dm_insert', b);
  END LOOP;
END $$;

-- 7) contactability
CREATE OR REPLACE FUNCTION public.can_dm(p_other uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE my_role text; other_role text; my_level int; other_level int;
BEGIN
  IF p_other = auth.uid() OR p_other IS NULL THEN RETURN false; END IF;
  SELECT role INTO my_role FROM profiles WHERE id = auth.uid();
  SELECT role INTO other_role FROM profiles WHERE id = p_other;
  IF my_role IS NULL OR other_role IS NULL THEN RETURN false; END IF;
  IF my_role = 'admin' OR other_role IN ('admin','trainer') THEN RETURN true; END IF;
  IF my_role = 'trainer' THEN
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = p_other AND (s.assigned_trainer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = auth.uid())));
  END IF;
  -- student → same active level
  SELECT academic_level INTO my_level FROM students WHERE id = auth.uid();
  SELECT academic_level INTO other_level FROM students WHERE id = p_other;
  RETURN other_level IS NOT NULL AND other_level = my_level;
END $$;

-- 8) get or create thread
CREATE OR REPLACE FUNCTION public.dm_get_or_create_thread(p_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lo uuid; hi uuid; tid uuid;
BEGIN
  IF NOT public.can_dm(p_other) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  lo := LEAST(auth.uid(), p_other); hi := GREATEST(auth.uid(), p_other);
  SELECT id INTO tid FROM dm_threads WHERE user_lo = lo AND user_hi = hi;
  IF tid IS NULL THEN INSERT INTO dm_threads(user_lo, user_hi) VALUES (lo, hi) RETURNING id INTO tid; END IF;
  RETURN tid;
END $$;

-- 9) list my threads
CREATE OR REPLACE FUNCTION public.dm_list_threads()
RETURNS TABLE(thread_id uuid, other_id uuid, other_name text, other_avatar text, other_role text,
  last_body text, last_type text, last_at timestamptz, unread int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH mine AS (
    SELECT t.id, CASE WHEN t.user_lo = auth.uid() THEN t.user_hi ELSE t.user_lo END AS other, t.last_message_at
    FROM dm_threads t WHERE t.user_lo = auth.uid() OR t.user_hi = auth.uid()
  )
  SELECT m.id, m.other, p.full_name, p.avatar_url, p.role::text, lm.body, lm.type, m.last_message_at,
    (SELECT count(*)::int FROM group_messages g WHERE g.dm_thread_id = m.id AND g.deleted_at IS NULL
       AND g.sender_id <> auth.uid()
       AND g.created_at > COALESCE((SELECT last_read_at FROM dm_thread_reads r WHERE r.thread_id = m.id AND r.user_id = auth.uid()), '-infinity'::timestamptz)) AS unread
  FROM mine m
  JOIN profiles p ON p.id = m.other
  LEFT JOIN LATERAL (SELECT body, type FROM group_messages g WHERE g.dm_thread_id = m.id AND g.deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) lm ON true
  ORDER BY m.last_message_at DESC
$$;

-- 10) contactable people for the "new message" picker
CREATE OR REPLACE FUNCTION public.dm_list_contacts()
RETURNS TABLE(id uuid, name text, avatar text, role text, level int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE my_role text; my_level int;
BEGIN
  SELECT pr.role INTO my_role FROM profiles pr WHERE pr.id = auth.uid();   -- qualify (OUT param 'role' collides)
  IF my_role = 'student' THEN
    SELECT st.academic_level INTO my_level FROM students st WHERE st.id = auth.uid();
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id = s.id
      WHERE s.status = 'active' AND s.academic_level = my_level AND s.id <> auth.uid()
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.role::text IN ('trainer','admin');
  ELSIF my_role = 'trainer' THEN
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id = s.id
      WHERE s.status = 'active' AND (s.assigned_trainer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = auth.uid()))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.role::text = 'admin' AND p.id <> auth.uid();
  ELSE
    RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.id <> auth.uid();
  END IF;
END $$;

-- 11) fetch DM messages (mirror get_group_messages: raw rows newest-first)
CREATE OR REPLACE FUNCTION public.get_dm_messages(p_thread uuid, p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 60)
RETURNS SETOF group_messages LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM group_messages
  WHERE dm_thread_id = p_thread AND public.is_dm_member(p_thread) AND deleted_at IS NULL
    AND (p_before IS NULL OR created_at < p_before)
  ORDER BY created_at DESC LIMIT p_limit
$$;

-- 12) bump thread recency on new DM message
CREATE OR REPLACE FUNCTION public.dm_touch_thread() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.dm_thread_id IS NOT NULL THEN
    UPDATE dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.dm_thread_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_dm_touch ON group_messages;
CREATE TRIGGER trg_dm_touch AFTER INSERT ON group_messages FOR EACH ROW EXECUTE FUNCTION dm_touch_thread();

-- 13) grants
GRANT EXECUTE ON FUNCTION public.dm_get_or_create_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_list_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_list_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dm_messages(uuid, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_dm(uuid) TO authenticated;

-- 14) realtime for thread-list updates
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_threads;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
