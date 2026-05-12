-- Fix: soft-delete (remove highlight) always snaps back
--
-- Root cause: the SELECT policy's USING includes "deleted_at IS NULL".
-- PostgreSQL applies SELECT USING as an additional WITH CHECK for UPDATE
-- when both SELECT and UPDATE policies coexist on the same table.
-- Setting deleted_at = now() produces a new row where deleted_at IS NOT NULL,
-- so the check fails → UPDATE returns an RLS error → the frontend rollback
-- fires → the highlight colour reappears immediately.
--
-- Fix: remove deleted_at from the SELECT RLS policy.
-- Ownership-only filtering is sufficient; the application layer already
-- excludes soft-deleted rows via .is('deleted_at', null) in useWordHighlights.

DROP POLICY IF EXISTS "Students see own highlights" ON public.student_word_highlights;

CREATE POLICY "Students see own highlights"
  ON public.student_word_highlights FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
