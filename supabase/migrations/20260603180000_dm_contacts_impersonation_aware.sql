-- Make the DM contact list impersonation-aware.
-- Impersonation in the app is client-side only (the Supabase auth session stays
-- the admin's), so dm_list_contacts() saw auth.uid()=admin and returned EVERYONE
-- when an admin previewed the picker "as" a student. That made the (correct)
-- student-side restriction impossible to see/verify through impersonation.
--
-- Fix: optional p_as_user. It is honored ONLY when the real caller is an admin,
-- so a student can never use it to widen their own contact list. When honored,
-- the list is computed exactly as that user (student/trainer) would see it.
--
-- Drop the previous zero-arg signature first: adding a defaulted param creates a
-- NEW overload rather than replacing it, which makes the no-arg call ambiguous
-- (PostgREST PGRST203). One signature only.
DROP FUNCTION IF EXISTS public.dm_list_contacts();

CREATE OR REPLACE FUNCTION public.dm_list_contacts(p_as_user uuid DEFAULT NULL)
RETURNS TABLE(id uuid, name text, avatar text, role text, level int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE caller_role text; acting uuid; my_role text; my_level int;
BEGIN
  SELECT pr.role::text INTO caller_role FROM profiles pr WHERE pr.id = auth.uid();
  -- Admins may view the picker "as" another user (impersonation preview).
  IF p_as_user IS NOT NULL AND caller_role = 'admin' THEN
    acting := p_as_user;
  ELSE
    acting := auth.uid();
  END IF;

  SELECT pr.role::text INTO my_role FROM profiles pr WHERE pr.id = acting;
  IF my_role = 'student' THEN
    SELECT st.academic_level INTO my_level FROM students st WHERE st.id = acting;
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id = s.id
      WHERE s.status='active' AND s.academic_level = my_level AND s.id <> acting AND NOT COALESCE(p.is_test_account,false)
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='trainer' AND NOT COALESCE(p.is_test_account,false) AND EXISTS (
        SELECT 1 FROM students s WHERE s.id=acting AND (s.assigned_trainer_id=p.id OR EXISTS (SELECT 1 FROM groups g WHERE g.id=s.group_id AND g.trainer_id=p.id)))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='admin' AND p.dm_contactable AND NOT COALESCE(p.is_test_account,false);
  ELSIF my_role='trainer' THEN
    RETURN QUERY
      SELECT p.id, p.full_name, p.avatar_url, 'student'::text, s.academic_level
      FROM students s JOIN profiles p ON p.id=s.id
      WHERE s.status='active' AND NOT COALESCE(p.is_test_account,false) AND (s.assigned_trainer_id=acting
        OR EXISTS (SELECT 1 FROM groups g WHERE g.id=s.group_id AND g.trainer_id=acting))
      UNION
      SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p
      WHERE p.role::text='admin' AND p.dm_contactable AND p.id<>acting AND NOT COALESCE(p.is_test_account,false);
  ELSE
    -- An actual admin (not impersonating) can reach anyone.
    RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.role::text, NULL::int FROM profiles p WHERE p.id<>acting;
  END IF;
END $fn$;
GRANT EXECUTE ON FUNCTION public.dm_list_contacts(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
