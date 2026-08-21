-- coordinator_last_seen() was the one SECURITY DEFINER function in the console
-- without a role guard.
--
-- EXECUTE was already revoked from PUBLIC and anon, so it was never reachable
-- unauthenticated. But it was granted to `authenticated`, which includes every
-- student: a logged-in student could pass any other student's id and read back
-- their last-seen timestamp. One timestamp is not much, but a SECURITY DEFINER
-- function that answers questions about other people's rows is exactly the
-- shape of hole that gets widened later by someone adding a field to it.
--
-- Same guard as every other RPC in the console. Callers are all guarded
-- functions themselves, so nothing else changes.

CREATE OR REPLACE FUNCTION public.coordinator_last_seen(p_student_id uuid)
RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM coordinator_guard();

  RETURN GREATEST(
    (SELECT s.last_active_at FROM students s WHERE s.id = p_student_id),
    (SELECT max(x.created_at)  FROM xp_transactions x             WHERE x.student_id = p_student_id),
    (SELECT max(u.occurred_at) FROM unified_activity_log u        WHERE u.student_id = p_student_id),
    (SELECT max(c.updated_at)  FROM student_curriculum_progress c WHERE c.student_id = p_student_id)
  );
END $$;

REVOKE ALL ON FUNCTION public.coordinator_last_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_last_seen(uuid) TO authenticated;
