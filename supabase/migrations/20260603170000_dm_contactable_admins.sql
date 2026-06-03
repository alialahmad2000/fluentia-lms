-- Restrict which ADMIN(s) students/trainers can DM: only profiles flagged
-- dm_contactable (the owner, د. علي الأحمد). Also excludes test accounts.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dm_contactable boolean DEFAULT false;
UPDATE profiles SET dm_contactable = true WHERE role = 'admin' AND full_name = 'د. علي الأحمد';

CREATE OR REPLACE FUNCTION public.can_dm(p_other uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE my_role text; other_role text; my_level int; other_level int;
BEGIN
  IF p_other = auth.uid() OR p_other IS NULL THEN RETURN false; END IF;
  SELECT pr.role::text INTO my_role FROM profiles pr WHERE pr.id = auth.uid();
  SELECT pr.role::text INTO other_role FROM profiles pr WHERE pr.id = p_other;
  IF my_role IS NULL OR other_role IS NULL THEN RETURN false; END IF;
  IF my_role = 'admin' THEN RETURN true; END IF;                       -- owner/admin can reach anyone
  IF COALESCE((SELECT is_test_account FROM profiles WHERE id = p_other), false) THEN RETURN false; END IF;
  IF other_role = 'admin' THEN                                          -- only the contactable admin(s)
    RETURN COALESCE((SELECT dm_contactable FROM profiles WHERE id = p_other), false);
  END IF;
  IF my_role = 'trainer' THEN
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = p_other AND (s.assigned_trainer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = auth.uid())));
  END IF;
  IF other_role = 'trainer' THEN                                        -- student → only their OWN teacher
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = auth.uid()
      AND (s.assigned_trainer_id = p_other OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = p_other)));
  END IF;
  SELECT academic_level INTO my_level FROM students WHERE id = auth.uid();   -- student → same level peer
  SELECT academic_level INTO other_level FROM students WHERE id = p_other;
  RETURN other_level IS NOT NULL AND other_level = my_level;
END $fn$;

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
      WHERE s.status='active' AND s.academic_level = my_level AND s.id <> auth.uid() AND NOT COALESCE(p.is_test_account,false)
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='trainer' AND NOT COALESCE(p.is_test_account,false) AND EXISTS (
        SELECT 1 FROM students s WHERE s.id=auth.uid() AND (s.assigned_trainer_id=p.id OR EXISTS (SELECT 1 FROM groups g WHERE g.id=s.group_id AND g.trainer_id=p.id)))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='admin' AND p.dm_contactable AND NOT COALESCE(p.is_test_account,false);
  ELSIF my_role='trainer' THEN
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id=s.id
      WHERE s.status='active' AND NOT COALESCE(p.is_test_account,false) AND (s.assigned_trainer_id=auth.uid()
        OR EXISTS (SELECT 1 FROM groups g WHERE g.id=s.group_id AND g.trainer_id=auth.uid()))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='admin' AND p.dm_contactable AND p.id<>auth.uid() AND NOT COALESCE(p.is_test_account,false);
  ELSE
    RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.id<>auth.uid();
  END IF;
END $fn$;
NOTIFY pgrst, 'reload schema';
