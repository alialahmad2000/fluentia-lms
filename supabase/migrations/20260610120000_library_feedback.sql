-- Library guestbook (دفتر زوّار المكتبة) — student feedback + suggestions for the
-- bilingual-novels Library. A row needs at least one of: rating / thoughts / suggestion.
-- Mirrors the bug_reports conventions (insert own, select own+staff, staff triage).

CREATE TABLE IF NOT EXISTS public.library_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name  text,
  rating        smallint CHECK (rating BETWEEN 1 AND 5),
  thoughts      text,                          -- وش رأيك بالمكتبة
  suggestion    text,                          -- روايات/أفكار يقترحونها
  status        text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','seen','done')),
  admin_notes   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT library_feedback_not_empty CHECK (
    rating IS NOT NULL
    OR COALESCE(btrim(thoughts), '') <> ''
    OR COALESCE(btrim(suggestion), '') <> ''
  )
);

COMMENT ON TABLE public.library_feedback IS
  'Student guestbook entries for the Library (novels): rating + thoughts + suggestions. Staff triage via status.';

CREATE INDEX IF NOT EXISTS library_feedback_status_idx  ON public.library_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS library_feedback_student_idx ON public.library_feedback (student_id, created_at DESC);

ALTER TABLE public.library_feedback ENABLE ROW LEVEL SECURITY;

-- A user writes a guestbook entry as themselves only.
DROP POLICY IF EXISTS library_feedback_insert_own ON public.library_feedback;
CREATE POLICY library_feedback_insert_own ON public.library_feedback
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- A user sees their own entries; staff see all.
DROP POLICY IF EXISTS library_feedback_select ON public.library_feedback;
CREATE POLICY library_feedback_select ON public.library_feedback
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.role IN ('admin','trainer'))
  );

-- Staff triage (status / notes).
DROP POLICY IF EXISTS library_feedback_staff_update ON public.library_feedback;
CREATE POLICY library_feedback_staff_update ON public.library_feedback
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

DROP POLICY IF EXISTS library_feedback_service_all ON public.library_feedback;
CREATE POLICY library_feedback_service_all ON public.library_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Defense-in-depth: the client caps inputs at 2000 chars; the DB enforces 4000
-- so a crafted request can't store unbounded payloads.
ALTER TABLE public.library_feedback
  DROP CONSTRAINT IF EXISTS library_feedback_len_chk;
ALTER TABLE public.library_feedback
  ADD CONSTRAINT library_feedback_len_chk
  CHECK (char_length(COALESCE(thoughts, '')) <= 4000
     AND char_length(COALESCE(suggestion, '')) <= 4000);
