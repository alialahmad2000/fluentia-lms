-- ============================================================================
-- Reading subsections (Ali 2026-07-25) — the reading section becomes a LADDER:
--   دليل القراءة → أنواع الأسئلة → المهارات المصغّرة → تحت الساعة → الاختبارات
--   with «أخطائي في القراءة» closing the loop back to the rung you fell off.
--
-- This migration adds the three things the ladder needs and the app does not
-- yet record:
--   1. a CAUSE on every wrong answer (not just a question type)
--   2. micro-drill content + attempts (60-second reps on the raw sub-skill)
--   3. read-side RPCs that aggregate per-question-type accuracy / seconds
--      and per-cause error counts out of the JSON already in skill sessions
-- Additive only. No existing column/row/policy is changed.
-- ============================================================================

-- ── 1 · WHY the answer was wrong ────────────────────────────────────────────
-- Four causes, because every reading mistake is one of them and each maps to
-- exactly one rung of the ladder:
--   paraphrase_trap  → located it, picked the surface-similar option  → رادار إعادة الصياغة
--   not_located      → searched the wrong paragraph / never got there → القنص
--   misread          → located it, misread a qualifier (all/may/…)    → الكلمات المحدِّدة
--   ran_out_of_time  → left blank or guessed in the last minutes      → تحت الساعة
ALTER TABLE public.ielts_error_bank
  ADD COLUMN IF NOT EXISTS cause TEXT
    CHECK (cause IS NULL OR cause IN ('paraphrase_trap','not_located','misread','ran_out_of_time')),
  ADD COLUMN IF NOT EXISTS seconds_spent INTEGER;

CREATE INDEX IF NOT EXISTS idx_error_bank_cause
  ON public.ielts_error_bank (student_id, skill_type, cause)
  WHERE cause IS NOT NULL;

-- ── 2 · Micro-drill content ─────────────────────────────────────────────────
-- Four drill kinds, each a 15-90 second rep on ONE raw sub-skill:
--   paraphrase  رادار إعادة الصياغة — which fragment says the same thing?
--   scan        القنص              — find the number/name/date, against a clock
--   gist        صيد الفكرة         — 20s on a paragraph, pick its heading
--   qualifier   الكلمات المحدِّدة   — all / some / may / must → T vs NG
CREATE TABLE IF NOT EXISTS public.ielts_micro_drills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_kind        TEXT NOT NULL CHECK (drill_kind IN ('paraphrase','scan','gist','qualifier')),
  difficulty        SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  -- payload shape is per-kind; every kind carries { prompt, options[], answer, note_ar }
  payload           JSONB NOT NULL,
  source_passage_id UUID REFERENCES public.ielts_reading_passages(id) ON DELETE SET NULL,
  is_published      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_drills_kind
  ON public.ielts_micro_drills (drill_kind, difficulty, sort_order)
  WHERE is_published;

ALTER TABLE public.ielts_micro_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_micro_drills ON public.ielts_micro_drills;
CREATE POLICY auth_read_micro_drills ON public.ielts_micro_drills
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS admin_all_micro_drills ON public.ielts_micro_drills;
CREATE POLICY admin_all_micro_drills ON public.ielts_micro_drills
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles
                         WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS service_micro_drills ON public.ielts_micro_drills;
CREATE POLICY service_micro_drills ON public.ielts_micro_drills
  FOR ALL USING (auth.role() = 'service_role');

-- ── 3 · Micro-drill attempts ────────────────────────────────────────────────
-- One row per rep. Deliberately tiny: a drill is worthless if logging it is
-- slower than answering it.
CREATE TABLE IF NOT EXISTS public.ielts_micro_drill_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drill_kind   TEXT NOT NULL,
  drill_id     UUID REFERENCES public.ielts_micro_drills(id) ON DELETE SET NULL,
  is_correct   BOOLEAN NOT NULL,
  ms           INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_attempts_student
  ON public.ielts_micro_drill_attempts (student_id, drill_kind, created_at DESC);

ALTER TABLE public.ielts_micro_drill_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_own_micro_attempts ON public.ielts_micro_drill_attempts;
CREATE POLICY students_own_micro_attempts ON public.ielts_micro_drill_attempts
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS staff_read_micro_attempts ON public.ielts_micro_drill_attempts;
CREATE POLICY staff_read_micro_attempts ON public.ielts_micro_drill_attempts
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles
                            WHERE profiles.id = auth.uid()
                              AND profiles.role IN ('admin','trainer')));

DROP POLICY IF EXISTS service_micro_attempts ON public.ielts_micro_drill_attempts;
CREATE POLICY service_micro_attempts ON public.ielts_micro_drill_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4 · Per-question-type reading stats (the heatmap's data) ────────────────
-- Reads the perQuestion JSON already written by every reading session. Handles
-- BOTH session shapes: single-passage { perQuestion } and full test
-- { perPassage[].perQuestion }.
--
-- SECURITY DEFINER because staff must be able to read a student's stats while
-- viewing-as; the explicit caller check below is what makes that safe — without
-- it, any student could pass another student's id. (This project has shipped
-- that exact hole before; do not remove the guard.)
CREATE OR REPLACE FUNCTION public.ielts_reading_type_stats(p_student UUID)
RETURNS TABLE (
  question_type TEXT,
  attempted     INTEGER,
  correct       INTEGER,
  avg_seconds   NUMERIC,
  last_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles
                     WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','trainer')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
  WITH pq AS (
    SELECT s.completed_at AS at,
           NULLIF(q->>'type','')            AS qtype,
           (q->>'isCorrect')::BOOLEAN       AS ok,
           NULLIF(q->>'secs','')::NUMERIC   AS secs
    FROM public.ielts_skill_sessions s
    CROSS JOIN LATERAL (
      SELECT e AS q
        FROM jsonb_array_elements(COALESCE(s.session_data->'perQuestion','[]'::jsonb)) e
      UNION ALL
      SELECT e2 AS q
        FROM jsonb_array_elements(COALESCE(s.session_data->'perPassage','[]'::jsonb)) pp,
             jsonb_array_elements(COALESCE(pp->'perQuestion','[]'::jsonb)) e2
    ) x
    WHERE s.student_id = p_student
      AND s.skill_type = 'reading'
  )
  SELECT pq.qtype,
         COUNT(*)::INTEGER,
         COUNT(*) FILTER (WHERE pq.ok)::INTEGER,
         ROUND(AVG(pq.secs), 1),
         MAX(pq.at)
  FROM pq
  WHERE pq.qtype IS NOT NULL
  GROUP BY pq.qtype;
END;
$$;

REVOKE ALL ON FUNCTION public.ielts_reading_type_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ielts_reading_type_stats(UUID) TO authenticated, service_role;

-- ── 5 · Per-cause error counts (the diagnosis page's headline) ──────────────
CREATE OR REPLACE FUNCTION public.ielts_reading_error_causes(p_student UUID)
RETURNS TABLE (cause TEXT, n INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles
                     WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','trainer')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
  SELECT COALESCE(eb.cause,'unclassified'), COUNT(*)::INTEGER
  FROM public.ielts_error_bank eb
  WHERE eb.student_id = p_student
    AND eb.skill_type = 'reading'
    AND eb.mastered IS NOT TRUE
  GROUP BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.ielts_reading_error_causes(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ielts_reading_error_causes(UUID) TO authenticated, service_role;
