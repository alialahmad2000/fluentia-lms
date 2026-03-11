-- ============================================================================
-- 008_fix_notifications_rls.sql
-- Fix notifications SELECT policy to allow trainers/admins to read notes
-- they created for students (trainer_encouragement, trainer_observation,
-- trainer_warning type notifications).
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

-- Create updated policy: users see their own + trainers see notes for their group students + admin sees all
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid()                                        -- user sees own notifications
    OR (is_trainer() AND user_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))                                                          -- trainers see notifications for their students
    OR is_admin()                                               -- admin sees all
  );

-- Also fix the delete policy to allow trainers to delete notes they created
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR (is_trainer() AND user_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
  );
