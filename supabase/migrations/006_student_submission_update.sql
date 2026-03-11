-- ============================================================================
-- 006: Allow students to update their own submissions
-- Students need to update drafts → submitted, and update content while in draft
-- ============================================================================

CREATE POLICY "submissions_update_student"
  ON public.submissions FOR UPDATE
  USING (
    student_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
  );
