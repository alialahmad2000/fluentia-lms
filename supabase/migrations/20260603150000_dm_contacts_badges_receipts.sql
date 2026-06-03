-- Tighten student contactability (same-level peers + their OWN teacher(s) + admins),
-- add a combined unread-badge RPC, and a DM read-receipt RPC.

-- 1) can_dm — student may DM: same-level active students, their OWN trainer(s), admins.
CREATE OR REPLACE FUNCTION public.can_dm(p_other uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE my_role text; other_role text; my_level int; other_level int;
BEGIN
  IF p_other = auth.uid() OR p_other IS NULL THEN RETURN false; END IF;
  SELECT pr.role::text INTO my_role FROM profiles pr WHERE pr.id = auth.uid();
  SELECT pr.role::text INTO other_role FROM profiles pr WHERE pr.id = p_other;
  IF my_role IS NULL OR other_role IS NULL THEN RETURN false; END IF;
  IF my_role = 'admin' THEN RETURN true; END IF;
  IF my_role = 'trainer' THEN
    RETURN other_role = 'admin'
      OR EXISTS (SELECT 1 FROM students s WHERE s.id = p_other AND (s.assigned_trainer_id = auth.uid()
           OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = auth.uid())));
  END IF;
  -- student
  IF other_role = 'admin' THEN RETURN true; END IF;
  IF other_role = 'trainer' THEN
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = auth.uid()
      AND (s.assigned_trainer_id = p_other
        OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = p_other)));
  END IF;
  SELECT academic_level INTO my_level FROM students WHERE id = auth.uid();
  SELECT academic_level INTO other_level FROM students WHERE id = p_other;
  RETURN other_level IS NOT NULL AND other_level = my_level;
END $fn$;

-- 2) dm_list_contacts — student sees same-level peers + own teacher(s) + admins only.
CREATE OR REPLACE FUNCTION public.dm_list_contacts()
RETURNS TABLE(id uuid, name text, avatar text, role text, level int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE my_role text; my_level int;
BEGIN
  SELECT pr.role::text INTO my_role FROM profiles pr WHERE pr.id = auth.uid();
  IF my_role = 'student' THEN
    SELECT st.academic_level INTO my_level FROM students st WHERE st.id = auth.uid();
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id = s.id
      WHERE s.status = 'active' AND s.academic_level = my_level AND s.id <> auth.uid()
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int
      FROM profiles p
      WHERE p.role::text = 'trainer' AND EXISTS (
        SELECT 1 FROM students s WHERE s.id = auth.uid()
          AND (s.assigned_trainer_id = p.id OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = p.id)))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.role::text = 'admin';
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
END $fn$;

-- 3) combined unread badge: group (vs general cursor) + DMs
CREATE OR REPLACE FUNCTION public.get_chat_unread_badge()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
  SELECT (
    SELECT count(*)::int FROM group_messages m
    WHERE m.dm_thread_id IS NULL AND m.deleted_at IS NULL AND m.sender_id <> auth.uid()
      AND public.is_in_group(m.group_id)
      AND m.created_at > COALESCE((
        SELECT cur.last_read_at FROM channel_read_cursors cur
        JOIN group_channels gc ON gc.id = cur.channel_id
        WHERE gc.slug = 'general' AND gc.group_id = m.group_id AND cur.user_id = auth.uid()), '-infinity'::timestamptz)
  ) + (
    SELECT COALESCE(SUM((
      SELECT count(*) FROM group_messages g
      WHERE g.dm_thread_id = t.id AND g.deleted_at IS NULL AND g.sender_id <> auth.uid()
        AND g.created_at > COALESCE((SELECT last_read_at FROM dm_thread_reads r WHERE r.thread_id = t.id AND r.user_id = auth.uid()), '-infinity'::timestamptz)
    )), 0)::int
    FROM dm_threads t WHERE t.user_lo = auth.uid() OR t.user_hi = auth.uid()
  )
$fn$;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_badge() TO authenticated;

-- 4) DM read receipt: the OTHER member's last_read_at (member-only)
CREATE OR REPLACE FUNCTION public.dm_other_last_read(p_thread uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
  SELECT r.last_read_at FROM dm_thread_reads r
  WHERE r.thread_id = p_thread AND public.is_dm_member(p_thread) AND r.user_id <> auth.uid()
  ORDER BY r.last_read_at DESC LIMIT 1
$fn$;
GRANT EXECUTE ON FUNCTION public.dm_other_last_read(uuid) TO authenticated;

-- realtime for read receipts
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE dm_thread_reads; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
